using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.ComponentModel.DataAnnotations.Schema;
using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using advserviceses;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddDbContext<WowContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));
builder.Services.AddSingleton<BatchUpdateProgress>();
// Simple in-memory cache for icons: ItemId -> IconUrl
builder.Services.AddSingleton<ConcurrentDictionary<int, string>>();
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReact", policy =>
    {
        policy.WithOrigins("http://localhost:3000") // Default React port
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors("AllowReact");

// --- API ENDPOINTS ---

app.MapGet("/api/customers", async (string? query, WowContext db) =>
{
    if (string.IsNullOrWhiteSpace(query))
    {
        return Results.Ok(await db.Customers.ToListAsync());
    }

    var normalizedQuery = query.ToLower();
    var customers = await db.Customers
        .Where(c => c.Name.ToLower().Contains(normalizedQuery) || 
                    (c.Battletag != null && c.Battletag.ToLower().Contains(normalizedQuery)) ||
                    c.DiscordId.ToLower().Contains(normalizedQuery))
        .ToListAsync();

    return Results.Ok(customers);
});

app.MapPost("/api/customers", async (Customer customer, WowContext db) =>
{
    db.Customers.Add(customer);
    await db.SaveChangesAsync();
    return Results.Created($"/api/customers/{customer.Id}", customer);
});

app.MapGet("/api/customers/{id:int}/characters", async (int id, WowContext db) => {
    var characters = await db.Characters
        .Where(c => c.CustomerId == id)
        .ToListAsync();

    return Results.Ok(characters);
});

app.MapPost("/api/customers/{id:int}/characters", async (int id, Character character, WowContext db) =>
{
    character.CustomerId = id;
    db.Characters.Add(character);
    try
    {
        await db.SaveChangesAsync();
        return Results.Created($"/api/customers/{id}/characters/{character.Id}", character);
    }
    catch (DbUpdateException)
    {
        return Results.Conflict("Character already exists for this realm.");
    }
});

// Endpoint to trigger the batch update (optional, but useful)
app.MapPost("/api/update-data", (IServiceScopeFactory scopeFactory, ILogger<Program> logger, BatchUpdateProgress progress, IConfiguration config) => {
    // We run this in a background task with its own scope to prevent disposal issues
    if (!progress.IsRunning)
    {
        logger.LogInformation("Starting background batch update...");
        _ = Task.Run(async () => await RunBatchUpdate(scopeFactory, logger, progress, config));
    }
    else
    {
        logger.LogInformation("Batch update already running, skipping trigger.");
    }
    return Results.Accepted();
});

app.MapGet("/api/update-progress", (BatchUpdateProgress progress) => Results.Ok(progress));

app.MapGet("/api/characters/{realm}/{name}/equipment", async (string realm, string name, ILogger<Program> logger, ConcurrentDictionary<int, string> iconCache, IConfiguration config) => {
    const string REGION = "eu";
    string blizzardClientId = config["Blizzard:ClientId"] ?? throw new Exception("Missing Blizzard:ClientId");
    string blizzardClientSecret = config["Blizzard:ClientSecret"] ?? throw new Exception("Missing Blizzard:ClientSecret");

    try {
        using var http = new HttpClient();
        
        // 1. Blizzard Token abrufen
        var authRequest = new HttpRequestMessage(HttpMethod.Post, "https://oauth.battle.net/token");
        var authContent = new FormUrlEncodedContent(new[] { new KeyValuePair<string, string>("grant_type", "client_credentials") });
        var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{blizzardClientId}:{blizzardClientSecret}"));
        authRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);
        authRequest.Content = authContent;

        var authResponse = await http.SendAsync(authRequest);
        authResponse.EnsureSuccessStatusCode();
        var tokenData = await authResponse.Content.ReadFromJsonAsync<BlizzardTokenResponse>();
        if (tokenData == null) return Results.Problem("Fehler beim Abrufen des Blizzard Access Tokens.");

        // 2. Equipment abrufen
        var realmSlug = realm.ToLower().Replace(" ", "-").Replace("'", "");
        var characterNameLower = name.ToLower();
        var blizzardEquipmentUrl = $"https://{REGION}.api.blizzard.com/profile/wow/character/{realmSlug}/{characterNameLower}/equipment?namespace=profile-{REGION}&locale=en_US";
        
        var equipmentRequest = new HttpRequestMessage(HttpMethod.Get, blizzardEquipmentUrl);
        equipmentRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenData.AccessToken);
        
        var equipmentResponse = await http.SendAsync(equipmentRequest);
        if (!equipmentResponse.IsSuccessStatusCode) {
            var errorContent = await equipmentResponse.Content.ReadAsStringAsync();
            logger.LogWarning("Blizzard API error for {Name}-{Realm}: {Status} {Content}", name, realm, equipmentResponse.StatusCode, errorContent);
            return Results.NotFound($"Equipment data not found on Blizzard API: {equipmentResponse.StatusCode}");
        }
        
        var equipmentData = await equipmentResponse.Content.ReadFromJsonAsync<BlizzardEquipmentResponse>();
        if (equipmentData == null) return Results.NotFound();

        // 3. Fetch Icons in parallel
        var tasks = equipmentData.EquippedItems.Select(async item => {
            var itemId = item.Item.Id;
            if (iconCache.TryGetValue(itemId, out var cachedUrl)) {
                item.IconUrl = cachedUrl;
            } else {
                try {
                    var mediaUrl = item.Media.Key.Href;
                    var mediaRequest = new HttpRequestMessage(HttpMethod.Get, mediaUrl);
                    mediaRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenData.AccessToken);
                    
                    var mediaResponse = await http.SendAsync(mediaRequest);
                    if (mediaResponse.IsSuccessStatusCode) {
                        var mediaData = await mediaResponse.Content.ReadFromJsonAsync<BlizzardMediaResponse>();
                        var iconAsset = mediaData?.Assets?.FirstOrDefault(a => a.Key == "icon");
                        if (iconAsset != null) {
                            item.IconUrl = iconAsset.Value;
                            iconCache[itemId] = iconAsset.Value;
                        }
                    }
                } catch (Exception ex) {
                    logger.LogWarning("Failed to fetch media for item {ItemId}: {Message}", itemId, ex.Message);
                }
            }

            // Also fetch icons for sockets/gems
            if (item.Sockets != null) {
                foreach (var socket in item.Sockets) {
                    if (socket.Item != null) {
                        var gemId = socket.Item.Id;
                        if (iconCache.TryGetValue(gemId, out var gemIconUrl)) {
                            socket.IconUrl = gemIconUrl;
                        } else {
                            try {
                                // ALWAYS construct the Media URL using the ID and STATIC namespace
                                var gemMediaUrl = $"https://{REGION}.api.blizzard.com/data/wow/media/item/{gemId}?namespace=static-{REGION}&locale=en_US";
                                
                                var gemMediaRequest = new HttpRequestMessage(HttpMethod.Get, gemMediaUrl);
                                gemMediaRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenData.AccessToken);
                                
                                var gemMediaResponse = await http.SendAsync(gemMediaRequest);
                                if (gemMediaResponse.IsSuccessStatusCode) {
                                    var rawJson = await gemMediaResponse.Content.ReadAsStringAsync();
                                    logger.LogInformation("Blizzard Media Response for Gem {GemId}: {Json}", gemId, rawJson);
                                    
                                    var gemMediaData = await gemMediaResponse.Content.ReadFromJsonAsync<BlizzardMediaResponse>();
                                    var iconAsset = gemMediaData?.Assets?.FirstOrDefault(a => a.Key == "icon");
                                    if (iconAsset != null) {
                                        socket.IconUrl = iconAsset.Value;
                                        iconCache[gemId] = iconAsset.Value;
                                        logger.LogInformation("Successfully found IconUrl for Gem {GemId}: {Url}", gemId, iconAsset.Value);
                                    } else {
                                        logger.LogWarning("Gem Media API returned success but no 'icon' asset found for Gem {GemId}", gemId);
                                    }
                                } else {
                                    var errorBody = await gemMediaResponse.Content.ReadAsStringAsync();
                                    logger.LogWarning("Gem Media API failed for Gem {GemId}: {Status} - {Body}", gemId, gemMediaResponse.StatusCode, errorBody);
                                }
                            } catch (Exception ex) {
                                logger.LogWarning("Failed to fetch media for gem {GemId}: {Message}", gemId, ex.Message);
                            }
                        }
                    }
                }
            }
        });

        await Task.WhenAll(tasks);

        // 4. Fetch Character Render
        try {
            var characterMediaUrl = $"https://{REGION}.api.blizzard.com/profile/wow/character/{realmSlug}/{characterNameLower}/character-media?namespace=profile-{REGION}&locale=en_US";
            var charMediaRequest = new HttpRequestMessage(HttpMethod.Get, characterMediaUrl);
            charMediaRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenData.AccessToken);
            
            var charMediaResponse = await http.SendAsync(charMediaRequest);
            if (charMediaResponse.IsSuccessStatusCode) {
                var charMediaData = await charMediaResponse.Content.ReadFromJsonAsync<BlizzardMediaResponse>();
                // Prefer 'main-raw' or 'main'
                var renderAsset = charMediaData?.Assets?.FirstOrDefault(a => a.Key == "main-raw") 
                               ?? charMediaData?.Assets?.FirstOrDefault(a => a.Key == "main")
                               ?? charMediaData?.Assets?.FirstOrDefault(a => a.Key == "avatar");
                
                if (renderAsset != null) {
                    equipmentData.CharacterRenderUrl = renderAsset.Value;
                }
            }
        } catch (Exception ex) {
            logger.LogWarning("Failed to fetch character media: {Message}", ex.Message);
        }

        return Results.Ok(equipmentData);
    }
    catch (Exception ex) {
        logger.LogError(ex, "Error fetching equipment from Blizzard for {Name}-{Realm}", name, realm);
        return Results.Problem(ex.Message);
    }
});

app.Run();

// --- BATCH UPDATE LOGIC (Moved from old Program.cs) ---

async Task RunBatchUpdate(IServiceScopeFactory scopeFactory, ILogger logger, BatchUpdateProgress progress, IConfiguration config)
{
    const string REGION = "eu";
    string blizzardClientId = config["Blizzard:ClientId"] ?? throw new Exception("Missing Blizzard:ClientId");
    string blizzardClientSecret = config["Blizzard:ClientSecret"] ?? throw new Exception("Missing Blizzard:ClientSecret");

    try 
    {
        // Absolute reset at the start
        progress.Current = 0;
        progress.Total = 0;
        progress.IsRunning = true;

        logger.LogInformation("--- Starte Batch-Update für alle Charaktere ---");
        
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<WowContext>();
        
        using var http = new HttpClient();

        // 1. Blizzard Token abrufen
        var authRequest = new HttpRequestMessage(HttpMethod.Post, "https://oauth.battle.net/token");
        var authContent = new FormUrlEncodedContent(new[] { new KeyValuePair<string, string>("grant_type", "client_credentials") });
        var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{blizzardClientId}:{blizzardClientSecret}"));
        authRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);
        authRequest.Content = authContent;

        var authResponse = await http.SendAsync(authRequest);
        authResponse.EnsureSuccessStatusCode();
        var tokenData = await authResponse.Content.ReadFromJsonAsync<BlizzardTokenResponse>();
        
        if (tokenData == null) throw new Exception("Fehler beim Abrufen des Blizzard Access Tokens.");

        var characters = await db.Characters.ToListAsync();
        logger.LogInformation("Found {Count} characters to update.", characters.Count);
        
        progress.Total = characters.Count;
        progress.Current = 0;

        foreach (var character in characters)
        {
            progress.Current++;
            try 
            {
                // 3. Raider.IO
                string rioApiUrl = $"https://raider.io/api/v1/characters/profile?region={REGION}&realm={character.Realm}&name={character.CharName}&fields=mythic_plus_scores_by_season:current";
                var rioData = await http.GetFromJsonAsync<RioResponse>(rioApiUrl);

                if (rioData != null && rioData.Seasons.Count > 0)
                {
                    var currentScores = rioData.Seasons[0].Scores;
                    character.RioAllScore = currentScores.All;
                    character.RioDpsScore = currentScores.Dps;
                    character.RioHealScore = currentScores.Healer;
                    character.RioTankScore = currentScores.Tank;
                }

                // 4. Blizzard
                var realmSlug = character.Realm.ToLower().Replace(" ", "-").Replace("'", "");
                var characterNameLower = character.CharName.ToLower();
                var blizzardProfileUrl = $"https://{REGION}.api.blizzard.com/profile/wow/character/{realmSlug}/{characterNameLower}?namespace=profile-{REGION}&locale=en_US";
                
                var profileRequest = new HttpRequestMessage(HttpMethod.Get, blizzardProfileUrl);
                profileRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", tokenData.AccessToken);
                
                var profileResponse = await http.SendAsync(profileRequest);
                if (profileResponse.IsSuccessStatusCode)
                {
                    var blizzardData = await profileResponse.Content.ReadFromJsonAsync<BlizzardProfileResponse>();
                    if (blizzardData != null)
                    {
                        character.Level = blizzardData.Level;
                        character.GearScore = blizzardData.EquippedItemLevel;
                        character.Class = blizzardData.CharacterClass.Name;
                        character.Faction = blizzardData.Faction.Name;
                    }
                }
                await db.SaveChangesAsync();
            }
            catch (Exception ex)
            {
                logger.LogWarning("Fehler bei {CharName}: {Message}", character.CharName, ex.Message);
            }
        }
        logger.LogInformation("--- Batch-Update abgeschlossen! ---");
    }
    catch (Exception ex)
    {
        logger.LogError("KRITISCHER FEHLER: {Message}", ex.Message);
    }
    finally
    {
        progress.IsRunning = false;
    }
}
