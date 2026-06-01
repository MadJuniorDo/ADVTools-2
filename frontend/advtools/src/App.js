import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE_URL = ''; // Uses relative path, relying on Nginx proxy in prod or dev server proxy

const getClassIcon = (className) => {
  if (!className) return null;
  const name = className.toLowerCase().replace(/\s+/g, '');
  return `/images/class/64/${name}.png`;
};

const getFactionIcon = (faction) => {
  if (!faction) return null;
  const f = faction.toLowerCase();
  if (f.includes('alliance')) return '/images/fraction/ui_allianceicon-round.jpg';
  if (f.includes('horde')) return '/images/fraction/ui_hordeicon.jpg';
  return null;
};

function App() {
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [characters, setCharacters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharRealm, setNewCharRealm] = useState('');
  const [newCustName, setNewCustName] = useState('');
  const [newCustDiscord, setNewCustDiscord] = useState('');
  const [newCustBattletag, setNewCustBattletag] = useState('');
  const [rioMenuChar, setRioMenuChar] = useState(null);
  const [rioMenuPos, setRioMenuPos] = useState({ x: 0, y: 0 });
  const [rioBestRuns, setRioBestRuns] = useState([]);
  const [staticDungeons, setStaticDungeons] = useState([]);
  const [rioLoading, setRioLoading] = useState(false);
  const [armoryChar, setArmoryChar] = useState(null);
  const [armoryGear, setArmoryGear] = useState(null);
  const [armoryRenderUrl, setArmoryRenderUrl] = useState(null);
  const [armoryLoading, setArmoryLoading] = useState(false);
  const [updatingCharacters, setUpdatingCharacters] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => {
      setRioMenuChar(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleRioClick = async (e, char) => {
    e.stopPropagation();
    setRioMenuPos({ x: e.pageX, y: e.pageY });
    setRioMenuChar(char);
    setRioBestRuns([]);
    setRioLoading(true);

    try {
      let currentStaticDungeons = staticDungeons;
      if (currentStaticDungeons.length === 0) {
        const staticRes = await axios.get('https://raider.io/api/v1/mythic-plus/static-data?expansion_id=11');
        if (staticRes.data && staticRes.data.seasons && staticRes.data.seasons.length > 0) {
          currentStaticDungeons = staticRes.data.seasons[0].dungeons;
          setStaticDungeons(currentStaticDungeons);
        }
      }

      const response = await axios.get(`https://raider.io/api/v1/characters/profile?region=eu&realm=${encodeURIComponent(char.realm)}&name=${encodeURIComponent(char.charName)}&fields=mythic_plus_best_runs`);
      
      const runs = response.data?.mythic_plus_best_runs || [];
      
      // Merge with static dungeons
      const mergedRuns = currentStaticDungeons.map(dungeon => {
        const characterRun = runs.find(run => run.short_name === dungeon.short_name);
        return characterRun || {
          short_name: dungeon.short_name,
          mythic_level: 0,
          num_keystone_upgrades: 0,
          score: 0
        };
      });

      // Sort by score descending
      mergedRuns.sort((a, b) => b.score - a.score);

      setRioBestRuns(mergedRuns);
    } catch (error) {
      console.error('Error fetching RIO best runs:', error);
    } finally {
      setRioLoading(false);
    }
  };

  const handleGsClick = async (char) => {
    setArmoryChar(char);
    setArmoryLoading(true);
    setArmoryGear(null);

    try {
      const response = await axios.get(`${API_BASE_URL}/api/characters/${encodeURIComponent(char.realm)}/${encodeURIComponent(char.charName)}/equipment`);
      if (response.data && response.data.equipped_items) {
        setArmoryRenderUrl(response.data.character_render_url);
        // Map Blizzard items to a easier-to-use object
        const gear = {};
        let ringCount = 1;
        let trinketCount = 1;

        response.data.equipped_items.forEach(item => {
          let slot = item.slot.type.toLowerCase();
          
          // Normalize slots like finger_1, finger_2, trinket_1, trinket_2
          if (slot.startsWith("finger")) {
            slot = `finger${ringCount++}`;
          } else if (slot.startsWith("trinket")) {
            slot = `trinket${trinketCount++}`;
          } else if (slot === "main_hand") {
            slot = "mainhand";
          } else if (slot === "off_hand") {
            slot = "offhand";
          } else {
            // Remove underscores for consistency (e.g., shirt_slot -> shirtslot)
            slot = slot.replace(/_/g, '');
          }
          
          gear[slot] = item;
        });
        setArmoryGear(gear);
      }
    } catch (error) {
      console.error('Error fetching gear data from Blizzard:', error);
    } finally {
      setArmoryLoading(false);
    }
  };

  useEffect(() => {
    if (!query) {
      searchCustomers('');
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      searchCustomers(query);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  const searchCustomers = async (searchQuery) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/customers?query=${searchQuery}`);
      setCustomers(response.data);
    } catch (error) {
      console.error('Error searching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerClick = async (customer) => {
    setSelectedCustomer(customer);
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/customers/${customer.id}/characters`);
      setCharacters(response.data);
      // Trigger background update
      updateCustomerCharacters(customer);
    } catch (error) {
      console.error('Error fetching characters:', error);
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCustomerCharacters = async (customer) => {
    setUpdatingCharacters(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/customers/${customer.id}/characters/update`);
      setCharacters(response.data);
    } catch (error) {
      console.error('Error updating characters:', error);
    } finally {
      setUpdatingCharacters(false);
    }
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustDiscord) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/customers`, {
        name: newCustName,
        discordId: newCustDiscord,
        battletag: newCustBattletag
      });
      setNewCustName('');
      setNewCustDiscord('');
      setNewCustBattletag('');
      searchCustomers(query); // Refresh the list
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer.');
    } finally {
      setLoading(false);
    }
  };

  const handleCharacterClick = (e) => {
    const range = document.createRange();
    range.selectNodeContents(e.currentTarget.querySelector('code'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const handleAddCharacter = async (e) => {
    e.preventDefault();
    if (!newCharName || !newCharRealm) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/customers/${selectedCustomer.id}/characters`, {
        charName: newCharName,
        realm: newCharRealm
      });
      setNewCharName('');
      setNewCharRealm('');
      // Refresh characters
      const response = await axios.get(`${API_BASE_URL}/api/customers/${selectedCustomer.id}/characters`);
      setCharacters(response.data);
    } catch (error) {
      console.error('Error adding character:', error);
      alert('Error adding character. It might already exist.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <h1>AdvTools</h1>
          <div className="quick-links">
            <a href="https://boostertools.de/adv" target="_blank" rel="noopener noreferrer" className="quick-link-btn sheet">
              🇧 BoosterTools
          </a>
            <a href="https://garona.de/sheet" target="_blank" rel="noopener noreferrer" className="quick-link-btn sheet">
              📅 Booking Sheet
            </a>
            <a href="https://garona.de/de/tools/missing-gold" target="_blank" rel="noopener noreferrer" className="quick-link-btn gold">
              💰 Gold
            </a>
            <div className="planer-wrapper">
              <a href="https://mythicplanner.com/" target="_blank" rel="noopener noreferrer" className="quick-link-btn planer">
                🗺️ Rio Planer
              </a>
            </div>
          </div>
        </div>
        <form className="add-customer-form top-form" onSubmit={handleAddCustomer}>
          <input 
            type="text" 
            placeholder="Customer Name" 
            value={newCustName}
            onChange={(e) => setNewCustName(e.target.value)}
            required
          />
          <input 
            type="text" 
            placeholder="Discord ID" 
            value={newCustDiscord}
            onChange={(e) => setNewCustDiscord(e.target.value)}
            required
          />
          <input 
            type="text" 
            placeholder="Battletag (Optional)" 
            value={newCustBattletag}
            onChange={(e) => setNewCustBattletag(e.target.value)}
          />
          <button type="submit" disabled={loading}>Add Customer</button>
        </form>
      </header>

      <main className="App-main">
        <div className="content-wrapper">
          <section className="customer-list">
            <div className="section-header">
              <h2>Customers</h2>
            </div>
            <div className="search-container sidebar-search">
              <input
                type="text"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="search-input"
              />
            </div>
            {loading && !selectedCustomer && <p>Loading...</p>}
            <ul>
              {customers.map((customer) => (
                <li 
                  key={customer.id} 
                  onClick={() => handleCustomerClick(customer)}
                  className={selectedCustomer?.id === customer.id ? 'active' : ''}
                >
                  <strong>{customer.name}</strong>
                  <span>{customer.discordId}</span>
                  {customer.battletag && <small>{customer.battletag}</small>}
                </li>
              ))}
              {!loading && query && customers.length === 0 && <p>No customers found.</p>}
            </ul>
          </section>

          <section className="character-view">
            {selectedCustomer ? (
              <>
                <div className="view-header">
                  <div className="view-header-title">
                    <h2>Characters for {selectedCustomer.name}</h2>
                    <button 
                      className="update-chars-btn" 
                      onClick={() => updateCustomerCharacters(selectedCustomer)}
                      disabled={updatingCharacters}
                      title="Update GearScore and RIO for all characters"
                    >
                      {updatingCharacters ? '🔄 Updating...' : '🔄 Update Data'}
                    </button>
                  </div>
                  <form className="add-char-form" onSubmit={handleAddCharacter}>
                    <input 
                      type="text" 
                      placeholder="Character Name" 
                      value={newCharName}
                      onChange={(e) => setNewCharName(e.target.value)}
                      required
                    />
                    <input 
                      type="text" 
                      placeholder="Realm" 
                      value={newCharRealm}
                      onChange={(e) => setNewCharRealm(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={loading}>Add Character</button>
                  </form>
                </div>
                {loading && characters.length === 0 && <p>Loading characters...</p>}
                {!loading && characters.length === 0 && <p>No characters found for this customer.</p>}
                <div className="character-grid">
                  {characters
                    .sort((a, b) => (b.rioAllScore || 0) - (a.rioAllScore || 0))
                    .map((char) => (
                    <div 
                      key={char.id} 
                      className="character-card"
                    >
                      <div className="char-info-main">
                        <div className="char-title-row">
                          {char.class && (
                            <img 
                              src={getClassIcon(char.class)} 
                              alt={char.class} 
                              className="class-icon"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <h3>{char.charName}</h3>
                        </div>
                        <div className="realm-faction-row">
                          {char.faction && (
                            <img 
                              src={getFactionIcon(char.faction)} 
                              alt={char.faction} 
                              className="faction-icon"
                              onError={(e) => e.target.style.display = 'none'}
                            />
                          )}
                          <p className="realm">{char.realm}{char.faction ? ` - ${char.faction}` : ''}</p>
                        </div>
                        <p className="class-level">
                          {char.class ? `${char.class} (Level ${char.level})` : 'Daten werden geladen...'}
                        </p>
                      </div>
                      
                      <div className="char-stats-container">
                        <div className="stats">
                          <div 
                            className="stat-item clickable" 
                            onClick={() => handleGsClick(char)}
                            title="Click for Armory"
                          >
                            <span>GS</span>
                            <strong>{char.gearScore !== null ? char.gearScore : '-'}</strong>
                          </div>
                          <div
                            className="stat-item clickable"
                            onClick={(e) => handleRioClick(e, char)}
                            title="Click for best runs"
                          >
                            <span>RIO</span>
                            <strong>{char.rioAllScore !== null ? char.rioAllScore.toFixed(0) : '-'}</strong>
                          </div>

                        </div>
                        
                        <div className="rio-details">
                          <div className="rio-role-item">
                            <img src="/images/roles/DPS.png" alt="DPS" className="role-icon" />
                            <span>DPS: {char.rioDpsScore !== null ? char.rioDpsScore.toFixed(0) : '-'}</span>
                          </div>
                          <div className="rio-role-item">
                            <img src="/images/roles/Heal.png" alt="Heal" className="role-icon" />
                            <span>Heal: {char.rioHealScore !== null ? char.rioHealScore.toFixed(0) : '-'}</span>
                          </div>
                          <div className="rio-role-item">
                            <img src="/images/roles/Tank.png" alt="Tank" className="role-icon" />
                            <span>Tank: {char.rioTankScore !== null ? char.rioTankScore.toFixed(0) : '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div 
                        className="invite-code-container"
                        onClick={handleCharacterClick}
                        title="Click to select invite"
                      >
                        <code>/invite {char.charName}-{char.realm.replace(/\s+/g, '')}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-state">
                <p>Select a customer to view their characters.</p>
              </div>
            )}
          </section>
        </div>
      </main>

      {rioMenuChar && (
        <div 
          className="rio-context-menu"
          style={{ top: rioMenuPos.y, left: rioMenuPos.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4>Best Runs: {rioMenuChar.charName}</h4>
          {rioLoading ? (
            <p>Loading...</p>
          ) : rioBestRuns.length > 0 ? (
            <table>
              <thead>
                <tr>
                  <th>Dungeon</th>
                  <th>Level</th>
                  <th>Timed</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {rioBestRuns.map((run, idx) => (
                  <tr key={idx}>
                    <td>{run.short_name}</td>
                    <td>{run.mythic_level}</td>
                    <td>{'+'.repeat(run.num_keystone_upgrades)}</td>
                    <td>{run.score.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>No runs found.</p>
          )}
        </div>
      )}

      {armoryChar && (
        <div className="armory-overlay" onClick={() => setArmoryChar(null)}>
          <div className="armory-modal" onClick={(e) => e.stopPropagation()}>
            <div className="armory-header">
              <div className="armory-char-info">
                <h2>{armoryChar.charName}</h2>
                <p>{armoryChar.realm} - {armoryChar.faction}</p>
                <p className="armory-class-level">{armoryChar.class} (Level {armoryChar.level})</p>
              </div>
              <div className="armory-gs">
                <span>GS</span>
                <strong>{armoryChar.gearScore}</strong>
              </div>
              <button className="close-btn" onClick={() => setArmoryChar(null)}>&times;</button>
            </div>
            
            <div className="armory-content">
              {armoryLoading ? (
                <div className="armory-loading">Loading Gear...</div>
              ) : armoryGear ? (
                <>
                  {armoryRenderUrl && (
                    <div className="armory-background-wrapper">
                      <img 
                        src={armoryRenderUrl} 
                        alt="Character Render" 
                        className="armory-render-bg"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}
                  <div className="armory-grid">
                    <div className="armory-column left">
                      {renderItem(armoryGear["head"], "Head")}
                      {renderItem(armoryGear["neck"], "Neck")}
                      {renderItem(armoryGear["shoulder"], "Shoulders")}
                      {renderItem(armoryGear["back"], "Back")}
                      {renderItem(armoryGear["chest"], "Chest")}
                      {renderItem(armoryGear["wrist"], "Wrist")}
                    </div>
                    
                    <div className="armory-center">
                      <div className="armory-weapons">
                        {renderItem(armoryGear["mainhand"], "Main Hand")}
                        {renderItem(armoryGear["offhand"] || armoryGear["shield"], "Off Hand")}
                      </div>
                    </div>
                    
                    <div className="armory-column right">
                      {renderItem(armoryGear["hands"], "Hands")}
                      {renderItem(armoryGear["waist"], "Waist")}
                      {renderItem(armoryGear["legs"], "Legs")}
                      {renderItem(armoryGear["feet"], "Feet")}
                      {renderItem(armoryGear["finger1"], "Ring 1")}
                      {renderItem(armoryGear["finger2"], "Ring 2")}
                      {renderItem(armoryGear["trinket1"], "Trinket 1")}
                      {renderItem(armoryGear["trinket2"], "Trinket 2")}
                    </div>
                  </div>
                </>
              ) : (
                <div className="armory-error">Could not load gear data from Blizzard API</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const renderItem = (item, slotName) => {
  if (!item) {
    return (
      <div className="armory-item empty">
        <div className="item-icon-container empty">
          <span className="slot-name">{slotName}</span>
        </div>
        <div className="item-details">
          <p className="item-name-empty">No item</p>
        </div>
      </div>
    );
  }

  const qualityColors = {
    "POOR": "#9d9d9d",
    "COMMON": "#ffffff",
    "UNCOMMON": "#1eff00",
    "RARE": "#0070dd",
    "EPIC": "#a335ee",
    "LEGENDARY": "#ff8000",
    "ARTIFACT": "#e6cc80",
    "HEIRLOOM": "#00ccff",
  };

  const color = qualityColors[item.quality?.type] || "#ffffff";
  const iconUrl = item.icon_url || `https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg`;
  
  return (
    <div className="armory-item">
      <div className="item-icon-container" style={{ borderColor: color }}>
        <img 
          src={iconUrl} 
          alt={item.name} 
          className="item-icon" 
          onError={(e) => {
            e.target.src = `https://wow.zamimg.com/images/wow/icons/large/inv_misc_questionmark.jpg`;
          }}
        />
        <span className="item-ilvl">{item.level?.value}</span>
      </div>
      <div className="item-details">
        <p className="item-name" style={{ color }}>{item.name}</p>
        <div className="item-subtitle-row">
          <span className="item-type">{item.inventory_type?.name}</span>
        </div>
        {item.sockets && item.sockets.length > 0 && (
          <div className="item-sockets">
            {item.sockets.map((socket, idx) => (
              <div key={idx} className={`socket ${socket.icon_url ? 'filled' : 'empty'}`} title={socket.display_string || socket.socket_type.name}>
                {socket.icon_url ? (
                  <img src={socket.icon_url} alt="Gem" className="gem-icon" />
                ) : (
                  <span className="empty-socket-x">×</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
