using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;

namespace advserviceses;

public class WowContext : DbContext
{
    private const string CONNECTION_STRING = "Host=192.168.178.81;Database=wow_costumer;Username=admin;Password=your_secure_password;Include Error Detail=true";
    public DbSet<Customer> Customers { get; set; }
    public DbSet<Character> Characters { get; set; }

    protected override void OnConfiguring(DbContextOptionsBuilder options)
        => options.UseNpgsql(CONNECTION_STRING);

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Tabellennamen auf Kleinschreibung mappen
        modelBuilder.Entity<Customer>().ToTable("customers");
        modelBuilder.Entity<Character>().ToTable("characters");

        // Unique Constraint für CharName + Realm (wie in der SQL-Definition)
        modelBuilder.Entity<Character>()
            .HasIndex(c => new { c.CharName, c.Realm })
            .IsUnique();
    }
}

public class Customer
{
    [Column("id")]
    public int Id { get; set; }
    
    [Column("discord_id")]
    public required string DiscordId { get; set; }
    
    [Column("name")]
    public required string Name { get; set; }
    
    [Column("battletag")]
    public string? Battletag { get; set; }
}

public class Character
{
    [Column("id")]
    public int Id { get; set; }
    
    [Column("customer_id")]
    public int CustomerId { get; set; }
    
    [Column("char_name")]
    public required string CharName { get; set; }
    
    [Column("realm")]
    public required string Realm { get; set; }
    
    [Column("faction")]
    public string? Faction { get; set; }
    
    [Column("class")]
    public string? Class { get; set; }
    
    [Column("rio_all_score", TypeName = "numeric(6,1)")]
    public decimal? RioAllScore { get; set; }
    
    [Column("rio_dps_score", TypeName = "numeric(6,1)")]
    public decimal? RioDpsScore { get; set; }
    
    [Column("rio_heal_score", TypeName = "numeric(6,1)")]
    public decimal? RioHealScore { get; set; }
    
    [Column("rio_tank_score", TypeName = "numeric(6,1)")]
    public decimal? RioTankScore { get; set; }

    [Column("gear_score")]
    public int? GearScore { get; set; }

    [Column("level")]
    public int? Level { get; set; }
}

// --- API MODELLE (JSON) ---

public record RioResponse(
    string Name,
    string Realm,
    string Class,
    [property: JsonPropertyName("mythic_plus_scores_by_season")] List<SeasonData> Seasons
);

public record SeasonData(Scores Scores);
public record Scores(decimal All, decimal Dps, decimal Healer, decimal Tank);

// --- BLIZZARD API MODELLE (JSON) ---

public record BlizzardTokenResponse(
    [property: JsonPropertyName("access_token")] string AccessToken,
    [property: JsonPropertyName("token_type")] string TokenType,
    [property: JsonPropertyName("expires_in")] int ExpiresIn
);

public record BlizzardNameRecord(string Name);

public record BlizzardProfileResponse(
    int Level,
    [property: JsonPropertyName("equipped_item_level")] int EquippedItemLevel,
    [property: JsonPropertyName("character_class")] BlizzardNameRecord CharacterClass,
    BlizzardNameRecord Faction
);

public class BlizzardEquipmentResponse
{
    [JsonPropertyName("equipped_items")] public required List<BlizzardEquippedItem> EquippedItems { get; set; }
    [JsonPropertyName("character_render_url")] public string? CharacterRenderUrl { get; set; }
}

public class BlizzardEquippedItem
{
    [JsonPropertyName("item")] public required BlizzardItemReference Item { get; set; }
    [JsonPropertyName("slot")] public required BlizzardNameType Slot { get; set; }
    [JsonPropertyName("level")] public required BlizzardValue ItemLevel { get; set; }
    [JsonPropertyName("quality")] public required BlizzardNameType Quality { get; set; }
    [JsonPropertyName("name")] public required string Name { get; set; }
    [JsonPropertyName("name_description")] public BlizzardNameType? NameDescription { get; set; }
    [JsonPropertyName("media")] public required BlizzardMediaReference Media { get; set; }
    [JsonPropertyName("inventory_type")] public required BlizzardNameType InventoryType { get; set; }
    
    [JsonPropertyName("icon_url")] public string? IconUrl { get; set; }
    
    [JsonPropertyName("sockets")] public List<BlizzardSocket>? Sockets { get; set; }
}

public class BlizzardSocket
{
    [JsonPropertyName("socket_type")] public required BlizzardNameType SocketType { get; set; }
    [JsonPropertyName("item")] public BlizzardItemReference? Item { get; set; }
    [JsonPropertyName("display_string")] public string? DisplayString { get; set; }
    
    [JsonPropertyName("icon_url")] public string? IconUrl { get; set; }
}

public record BlizzardItemReference(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("key")] BlizzardHref Key
);
public record BlizzardNameType(
    [property: JsonPropertyName("name")] string? Name, 
    [property: JsonPropertyName("type")] string? Type,
    [property: JsonPropertyName("display_string")] string? DisplayString,
    [property: JsonPropertyName("color")] BlizzardColor? Color
);

public record BlizzardColor(
    [property: JsonPropertyName("r")] int R,
    [property: JsonPropertyName("g")] int G,
    [property: JsonPropertyName("b")] int B,
    [property: JsonPropertyName("a")] double A
);
public record BlizzardValue(
    [property: JsonPropertyName("value")] int Value
);
public record BlizzardMediaReference(
    [property: JsonPropertyName("id")] int Id,
    [property: JsonPropertyName("key")] BlizzardHref Key
);

public record BlizzardHref(
    [property: JsonPropertyName("href")] string Href
);

public record BlizzardMediaResponse(
    [property: JsonPropertyName("assets")] List<BlizzardAsset>? Assets,
    [property: JsonPropertyName("character")] BlizzardNameRecord? Character,
    [property: JsonPropertyName("media")] BlizzardMediaReference? Media
);

public record BlizzardCharacterMediaResponse(
    [property: JsonPropertyName("assets")] List<BlizzardAsset> Assets
);

public record BlizzardAsset(
    [property: JsonPropertyName("key")] string Key,
    [property: JsonPropertyName("value")] string Value
);

public class BatchUpdateProgress
{
    [JsonPropertyName("total")]
    public int Total { get; set; }
    
    [JsonPropertyName("current")]
    public int Current { get; set; }
    
    [JsonPropertyName("isRunning")]
    public bool IsRunning { get; set; }
}
