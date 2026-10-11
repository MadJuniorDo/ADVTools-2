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
  const [openTabs, setOpenTabs] = useState(() => {
    try {
      const saved = localStorage.getItem('openCustomerTabs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [activeCustomerId, setActiveCustomerId] = useState(() => {
    try {
      const saved = localStorage.getItem('activeCustomerId');
      return saved ? parseInt(saved, 10) : null;
    } catch {
      return null;
    }
  });
  const [charactersCache, setCharactersCache] = useState({});
  const [loadingCustomerChars, setLoadingCustomerChars] = useState({});

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('favCustomerIds');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [sortMode, setSortMode] = useState(() => {
    return localStorage.getItem('customerSortMode') || 'custom';
  });
  const [customOrder, setCustomOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('customerCustomOrder');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [draggedId, setDraggedId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
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
  const [deletingCharId, setDeletingCharId] = useState(null);
  const [calcValue, setCalcValue] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [notesModalCustomer, setNotesModalCustomer] = useState(null);
  const [modalName, setModalName] = useState('');
  const [modalDiscord, setModalDiscord] = useState('');
  const [modalBattletag, setModalBattletag] = useState('');
  const [modalOrigin, setModalOrigin] = useState('');
  const [modalDiscount, setModalDiscount] = useState('');
  const [modalNotes, setModalNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [visibleBadges, setVisibleBadges] = useState(() => {
    try {
      const saved = localStorage.getItem('visibleBadges');
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      discord: false, // Default false: discord id is hidden by default as requested
      battletag: true,
      origin: true,
      discount: true,
      notes: true,
    };
  });
  const [showBadgeMenu, setShowBadgeMenu] = useState(false);

  const handleBadgeToggle = (key, value) => {
    setVisibleBadges(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('visibleBadges', JSON.stringify(updated));
      return updated;
    });
  };
  const [quickLinks, setQuickLinks] = useState(() => {
    const saved = localStorage.getItem('quickLinks');
    if (saved) return JSON.parse(saved);
    return [
      { id: 1, title: '🇧 BoosterTools', url: 'http://192.168.178.81:8010/adv', colorClass: 'sheet' },
      { id: 2, title: '📅 Booking Sheet', url: 'https://garona.de/sheet', colorClass: 'sheet' },
      { id: 3, title: '💰 Gold', url: 'https://garona.de/de/tools/missing-gold', colorClass: 'gold' },
      { id: 4, title: '🗺️ Rio Planer', url: 'https://mythicplanner.com/', colorClass: 'planer' }
    ];
  });
  
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true' || false;
  });

  useEffect(() => {
    localStorage.setItem('quickLinks', JSON.stringify(quickLinks));
  }, [quickLinks]);

  const handleLinkChange = (id, field, value) => {
    setQuickLinks(quickLinks.map(link => link.id === id ? { ...link, [field]: value } : link));
  };

  const handleAddLink = () => {
    setQuickLinks([...quickLinks, { id: Date.now(), title: 'New Link', url: 'https://', colorClass: 'sheet' }]);
  };

  const handleRemoveLink = (id) => {
    setQuickLinks(quickLinks.filter(link => link.id !== id));
  };

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.body.classList.add('dark-mode-body');
    } else {
      document.body.classList.remove('dark-mode-body');
    }
  }, [darkMode]);

  const calcResult = calcValue ? (parseFloat(calcValue) * 0.65).toLocaleString('de-DE', { maximumFractionDigits: 0 }) : '';

  useEffect(() => {
    const handleClickOutside = (e) => {
      setRioMenuChar(null);
      if (e && !e.target.closest('.badge-settings-container')) {
        setShowBadgeMenu(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setRioMenuChar(null);
        setArmoryChar(null);
        setNotesModalCustomer(null);
        setShowBadgeMenu(false);
      }
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
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
          const now = new Date();
          const activeSeason = staticRes.data.seasons.find(s => {
            if (s.starts && s.ends && s.starts.eu && s.ends.eu) {
              const start = new Date(s.starts.eu);
              const end = new Date(s.ends.eu);
              return now >= start && now <= end;
            }
            return false;
          }) || staticRes.data.seasons[0];
          currentStaticDungeons = activeSeason.dungeons;
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

  // Sync open tabs with fresh customer data from backend
  useEffect(() => {
    if (customers.length > 0 && openTabs.length > 0) {
      setOpenTabs(prevTabs => {
        let changed = false;
        const updated = prevTabs.map(tab => {
          const fresh = customers.find(c => c.id === tab.id);
          if (fresh && (
            fresh.name !== tab.name || 
            fresh.discordId !== tab.discordId || 
            fresh.battletag !== tab.battletag ||
            fresh.origin !== tab.origin ||
            fresh.discountPercent !== tab.discountPercent ||
            fresh.notes !== tab.notes
          )) {
            changed = true;
            return { ...tab, ...fresh };
          }
          return tab;
        });
        if (changed) {
          localStorage.setItem('openCustomerTabs', JSON.stringify(updated));
          return updated;
        }
        return prevTabs;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  // Load characters for active customer on mount
  useEffect(() => {
    if (activeCustomerId && openTabs.length > 0) {
      const activeCust = openTabs.find(t => t.id === activeCustomerId);
      if (activeCust) {
        loadCustomerCharacters(activeCust);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCustomerCharacters = async (customer, forceRefresh = false) => {
    if (!customer) return;
    if (charactersCache[customer.id] && !forceRefresh) {
      return;
    }

    setLoadingCustomerChars(prev => ({ ...prev, [customer.id]: true }));
    try {
      const response = await axios.get(`${API_BASE_URL}/api/customers/${customer.id}/characters`);
      setCharactersCache(prev => ({ ...prev, [customer.id]: response.data }));
      // Trigger background update
      if (!forceRefresh) {
        updateCustomerCharacters(customer);
      }
    } catch (error) {
      console.error('Error fetching characters:', error);
      setCharactersCache(prev => ({ ...prev, [customer.id]: [] }));
    } finally {
      setLoadingCustomerChars(prev => ({ ...prev, [customer.id]: false }));
    }
  };

  const updateCustomerCharacters = async (customer) => {
    if (!customer) return;
    setUpdatingCharacters(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/customers/${customer.id}/characters/update`);
      setCharactersCache(prev => ({ ...prev, [customer.id]: response.data }));
    } catch (error) {
      console.error('Error updating characters:', error);
    } finally {
      setUpdatingCharacters(false);
    }
  };

  const handleCustomerClick = (customer) => {
    setOpenTabs(prevTabs => {
      const exists = prevTabs.some(t => t.id === customer.id);
      let nextTabs = prevTabs;
      if (!exists) {
        nextTabs = [...prevTabs, customer];
        localStorage.setItem('openCustomerTabs', JSON.stringify(nextTabs));
      }
      return nextTabs;
    });

    setActiveCustomerId(customer.id);
    localStorage.setItem('activeCustomerId', customer.id.toString());
    loadCustomerCharacters(customer);
  };

  const handleTabClick = (customer) => {
    setActiveCustomerId(customer.id);
    localStorage.setItem('activeCustomerId', customer.id.toString());
    loadCustomerCharacters(customer);
  };

  const handleTabAuxClick = (e, customerId) => {
    if (e.button === 1) {
      // Middle click closes tab
      e.preventDefault();
      handleCloseTab(e, customerId);
    }
  };

  const handleCloseTab = (e, customerId) => {
    e.stopPropagation();
    setOpenTabs(prevTabs => {
      const tabIndex = prevTabs.findIndex(t => t.id === customerId);
      const nextTabs = prevTabs.filter(t => t.id !== customerId);
      localStorage.setItem('openCustomerTabs', JSON.stringify(nextTabs));

      if (activeCustomerId === customerId) {
        if (nextTabs.length > 0) {
          const nextActive = nextTabs[Math.min(tabIndex, nextTabs.length - 1)];
          setActiveCustomerId(nextActive.id);
          localStorage.setItem('activeCustomerId', nextActive.id.toString());
          loadCustomerCharacters(nextActive);
        } else {
          setActiveCustomerId(null);
          localStorage.removeItem('activeCustomerId');
        }
      }
      return nextTabs;
    });
  };

  const handleCloseAllTabs = () => {
    setOpenTabs([]);
    setActiveCustomerId(null);
    localStorage.removeItem('openCustomerTabs');
    localStorage.removeItem('activeCustomerId');
  };

  const toggleFavorite = (customerId, e) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(customerId)
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId];
      localStorage.setItem('favCustomerIds', JSON.stringify(next));
      return next;
    });
  };

  const handleSortChange = (e) => {
    const newMode = e.target.value;
    setSortMode(newMode);
    localStorage.setItem('customerSortMode', newMode);
  };

  const getSortedCustomers = (customerList) => {
    const favList = customerList.filter(c => favorites.includes(c.id));
    const nonFavList = customerList.filter(c => !favorites.includes(c.id));

    const sortFn = (a, b) => {
      if (sortMode === 'name-asc') {
        return a.name.localeCompare(b.name, 'de', { sensitivity: 'base' });
      }
      if (sortMode === 'name-desc') {
        return b.name.localeCompare(a.name, 'de', { sensitivity: 'base' });
      }
      if (sortMode === 'id-desc') {
        return b.id - a.id;
      }
      if (sortMode === 'id-asc') {
        return a.id - b.id;
      }
      // 'custom': use order in customOrder
      const idxA = customOrder.indexOf(a.id);
      const idxB = customOrder.indexOf(b.id);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.id - b.id;
    };

    favList.sort(sortFn);
    nonFavList.sort(sortFn);

    return { favList, nonFavList };
  };

  const handleMoveCustomer = (id, direction, isFav, e) => {
    e.stopPropagation();
    const { favList, nonFavList } = getSortedCustomers(customers);
    const targetList = isFav ? favList : nonFavList;
    const currentIdx = targetList.findIndex(c => c.id === id);
    if (currentIdx === -1) return;
    const targetIdx = currentIdx + direction;
    if (targetIdx < 0 || targetIdx >= targetList.length) return;

    const swapTargetId = targetList[targetIdx].id;

    setCustomOrder(prevOrder => {
      const allIds = [...prevOrder];
      customers.forEach(c => {
        if (!allIds.includes(c.id)) allIds.push(c.id);
      });
      const fromIdx = allIds.indexOf(id);
      const toIdx = allIds.indexOf(swapTargetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        allIds.splice(fromIdx, 1);
        allIds.splice(toIdx, 0, id);
      }
      localStorage.setItem('customerCustomOrder', JSON.stringify(allIds));
      return allIds;
    });

    setSortMode('custom');
    localStorage.setItem('customerSortMode', 'custom');
  };

  const handleDragStart = (e, id) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id.toString());
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== id) {
      setDragOverId(id);
    }
  };

  const handleDragLeave = () => {
    // optional feedback
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDrop = (e, targetId, isTargetFav) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }

    const isDraggedFav = favorites.includes(draggedId);

    // If dragged into favorites or out of favorites, update favorites state
    if (isDraggedFav !== isTargetFav) {
      setFavorites(prev => {
        const next = isTargetFav
          ? [...prev, draggedId]
          : prev.filter(id => id !== draggedId);
        localStorage.setItem('favCustomerIds', JSON.stringify(next));
        return next;
      });
    }

    // Reorder IDs in customOrder
    setCustomOrder(prevOrder => {
      const allIds = [...prevOrder];
      customers.forEach(c => {
        if (!allIds.includes(c.id)) allIds.push(c.id);
      });
      const fromIdx = allIds.indexOf(draggedId);
      const toIdx = allIds.indexOf(targetId);
      if (fromIdx !== -1 && toIdx !== -1) {
        allIds.splice(fromIdx, 1);
        allIds.splice(toIdx, 0, draggedId);
      }
      localStorage.setItem('customerCustomOrder', JSON.stringify(allIds));
      return allIds;
    });

    setSortMode('custom');
    localStorage.setItem('customerSortMode', 'custom');
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName || !newCustDiscord) return;

    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/customers`, {
        name: newCustName,
        discordId: newCustDiscord,
        battletag: newCustBattletag
      });
      setNewCustName('');
      setNewCustDiscord('');
      setNewCustBattletag('');
      searchCustomers(query);
      if (res.data && res.data.id) {
        handleCustomerClick(res.data);
      }
    } catch (error) {
      console.error('Error adding customer:', error);
      alert('Error adding customer.');
    } finally {
      setLoading(false);
    }
  };

  const openNotesModal = (customer, e) => {
    if (e) e.stopPropagation();
    setNotesModalCustomer(customer);
    setModalName(customer.name || '');
    setModalDiscord(customer.discordId || '');
    setModalBattletag(customer.battletag || '');
    setModalOrigin(customer.origin || '');
    setModalDiscount(customer.discountPercent !== null && customer.discountPercent !== undefined ? customer.discountPercent : '');
    setModalNotes(customer.notes || '');
    setSaveError(null);
  };

  const closeNotesModal = () => {
    setNotesModalCustomer(null);
    setSaveError(null);
  };

  const handleSaveCustomerNotes = async (e) => {
    e.preventDefault();
    if (!notesModalCustomer) return;
    setSavingNotes(true);
    setSaveError(null);
    try {
      const discountVal = modalDiscount === '' ? null : parseFloat(modalDiscount);
      const updatedPayload = {
        id: notesModalCustomer.id,
        name: modalName.trim(),
        discordId: modalDiscord.trim(),
        battletag: modalBattletag.trim() || null,
        origin: modalOrigin.trim() || null,
        discountPercent: isNaN(discountVal) ? null : discountVal,
        notes: modalNotes.trim() || null
      };

      const response = await axios.put(`${API_BASE_URL}/api/customers/${notesModalCustomer.id}`, updatedPayload);
      const updatedCustomer = response.data;

      // Update customers list
      setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? { ...c, ...updatedCustomer } : c));

      // Update open tabs
      setOpenTabs(prev => {
        const updated = prev.map(t => t.id === updatedCustomer.id ? { ...t, ...updatedCustomer } : t);
        localStorage.setItem('openCustomerTabs', JSON.stringify(updated));
        return updated;
      });

      closeNotesModal();
    } catch (err) {
      console.error('Error saving customer notes:', err);
      setSaveError('Fehler beim Speichern der Kundendaten.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleCharacterClick = (e) => {
    const range = document.createRange();
    range.selectNodeContents(e.currentTarget.querySelector('code'));
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const activeCustomer = openTabs.find(tab => tab.id === activeCustomerId) || null;
  const activeCharacters = activeCustomer ? (charactersCache[activeCustomer.id] || []) : [];
  const isActiveLoading = activeCustomer ? !!loadingCustomerChars[activeCustomer.id] : false;

  const handleAddCharacter = async (e) => {
    e.preventDefault();
    if (!newCharName || !newCharRealm || !activeCustomer) return;

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/api/customers/${activeCustomer.id}/characters`, {
        charName: newCharName,
        realm: newCharRealm
      });
      setNewCharName('');
      setNewCharRealm('');
      // Refresh characters
      const response = await axios.get(`${API_BASE_URL}/api/customers/${activeCustomer.id}/characters`);
      setCharactersCache(prev => ({ ...prev, [activeCustomer.id]: response.data }));
    } catch (error) {
      console.error('Error adding character:', error);
      alert('Error adding character. It might already exist.');
    } finally {
      setLoading(false);
    }
  };

  const exportCharacters = () => {
    if (!activeCustomer) return;
    const currentChars = charactersCache[activeCustomer.id] || [];
    if (currentChars.length === 0) {
      alert("No characters to export.");
      return;
    }

    const customerDetails = [
      `Kunde: ${activeCustomer.name}`,
      `Discord: ${activeCustomer.discordId}`,
      activeCustomer.battletag ? `Battletag: ${activeCustomer.battletag}` : null,
      activeCustomer.origin ? `Herkunft: ${activeCustomer.origin}` : null,
      activeCustomer.discountPercent !== null && activeCustomer.discountPercent !== undefined && activeCustomer.discountPercent > 0 ? `Rabatt: ${activeCustomer.discountPercent}%` : null,
      activeCustomer.notes ? `Notizen: ${activeCustomer.notes}` : null
    ].filter(Boolean).join('\n');

    const lines = currentChars.map(char => {
      const faction = char.faction || 'Unknown';
      const charClass = char.class || 'Unknown';
      
      const armoryLink = `https://worldofwarcraft.blizzard.com/en-gb/character/eu/${encodeURIComponent(char.realm.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(char.charName.toLowerCase())}`;
      const rioLink = `https://raider.io/characters/eu/${encodeURIComponent(char.realm.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(char.charName.toLowerCase())}`;
      
      const gs = char.gearScore !== null ? char.gearScore : '-';
      const rio = char.rioAllScore !== null ? char.rioAllScore.toFixed(0) : '-';
      const inviteString = `/invite ${char.charName}-${char.realm.replace(/\s+/g, '')}`;

      return `Character: ${char.charName} - ${char.realm}\nFaction: ${faction}\nClass: ${charClass}\nGS: ${gs} (${armoryLink})\nRIO: ${rio} (${rioLink})\nInvite: ${inviteString}\n`;
    });

    const exportText = `${customerDetails}\n\nCharacters:\n\n` + lines.join('\n');
    navigator.clipboard.writeText(exportText).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const exportSingleCharacter = (e, char) => {
    e.stopPropagation();
    const faction = char.faction || 'Unknown';
    const charClass = char.class || 'Unknown';
    
    const armoryLink = `https://worldofwarcraft.blizzard.com/en-gb/character/eu/${encodeURIComponent(char.realm.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(char.charName.toLowerCase())}`;
    const rioLink = `https://raider.io/characters/eu/${encodeURIComponent(char.realm.toLowerCase().replace(/\s+/g, '-'))}/${encodeURIComponent(char.charName.toLowerCase())}`;
    
    const gs = char.gearScore !== null ? char.gearScore : '-';
    const rio = char.rioAllScore !== null ? char.rioAllScore.toFixed(0) : '-';
    const inviteString = `/invite ${char.charName}-${char.realm.replace(/\s+/g, '')}`;

    const exportText = `Character: ${char.charName} - ${char.realm}\nFaction: ${faction}\nClass: ${charClass}\nGS: ${gs} (${armoryLink})\nRIO: ${rio} (${rioLink})\nInvite: ${inviteString}`;

    navigator.clipboard.writeText(exportText).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const handleDeleteCharacter = async (e, charId) => {
    e.stopPropagation();
    if (!activeCustomer) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/customers/${activeCustomer.id}/characters/${charId}`);
      setCharactersCache(prev => ({
        ...prev,
        [activeCustomer.id]: (prev[activeCustomer.id] || []).filter(c => c.id !== charId)
      }));
      setDeletingCharId(null);
    } catch (error) {
      console.error('Error deleting character:', error);
      alert('Error deleting character.');
      setDeletingCharId(null);
    }
  };

  const renderCustomerItem = (customer, isFav) => {
    const isTabActive = activeCustomerId === customer.id;
    const isTabOpen = openTabs.some(t => t.id === customer.id);
    const isDragging = draggedId === customer.id;
    const isDragOver = dragOverId === customer.id;

    return (
      <li 
        key={customer.id} 
        onClick={() => handleCustomerClick(customer)}
        className={`customer-item ${isTabActive ? 'active' : ''} ${isTabOpen ? 'is-open' : ''} ${isFav ? 'is-fav' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
        draggable
        onDragStart={(e) => handleDragStart(e, customer.id)}
        onDragOver={(e) => handleDragOver(e, customer.id)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, customer.id, isFav)}
        onDragEnd={handleDragEnd}
        title={isTabOpen ? `${customer.name} (Bereits als Register geöffnet)` : `${customer.name} (Klicken zum Öffnen)`}
      >
        <div className="customer-drag-handle" title="Ziehen zum Umsortieren">⠿</div>
        <div className="customer-info">
          <div className="customer-name-row">
            <strong>{customer.name}</strong>
            {visibleBadges.notes && customer.notes && (
              <span className="customer-sidebar-note-icon" title={customer.notes}>
                📝
              </span>
            )}
            {isTabOpen && <span className="open-dot-badge" title="Als Register geöffnet"></span>}
          </div>
          {(visibleBadges.discord || visibleBadges.battletag) && (
            <div className="customer-sub-row">
              {visibleBadges.discord && <span>{customer.discordId}</span>}
              {visibleBadges.battletag && customer.battletag && <small>{customer.battletag}</small>}
            </div>
          )}
          {visibleBadges.origin && customer.origin && (
            <div className="customer-origin-tag" title={`Herkunft: ${customer.origin}`}>
              📍 {customer.origin}
            </div>
          )}
        </div>
        <div className="customer-item-actions">
          <button 
            type="button"
            className="notes-item-btn"
            onClick={(e) => openNotesModal(customer, e)}
            title="Notizen & Kundendaten bearbeiten"
          >
            ✏️
          </button>
          <button 
            type="button"
            className={`fav-star-btn ${isFav ? 'active' : ''}`}
            onClick={(e) => toggleFavorite(customer.id, e)}
            title={isFav ? "Favorit entfernen" : "Als Favorit markieren"}
          >
            {isFav ? '★' : '☆'}
          </button>
          <div className="reorder-arrows">
            <button 
              type="button" 
              className="arrow-btn" 
              onClick={(e) => handleMoveCustomer(customer.id, -1, isFav, e)}
              title="Nach oben verschieben"
            >▲</button>
            <button 
              type="button" 
              className="arrow-btn" 
              onClick={(e) => handleMoveCustomer(customer.id, 1, isFav, e)}
              title="Nach unten verschieben"
            >▼</button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <header className="App-header">
        <div className="header-left">
          <h1>AdvTools</h1>
          <div className="quick-links">
            {quickLinks.map(link => (
              <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className={`quick-link-btn ${link.colorClass}`}>
                {link.title}
              </a>
            ))}
            <div className="calculator-wrapper">
              <span title="65% Calculator"></span>
              <input 
                type="number" 
                placeholder="Gold amount" 
                value={calcValue}
                onChange={(e) => setCalcValue(e.target.value)}
                className="calc-input"
              />
              {calcResult && <span className="calc-result">={calcResult}</span>}
            </div>
            <button 
              className="settings-toggle-btn"
              onClick={() => setShowSettings(!showSettings)}
              title={showSettings ? "Go to App" : "Settings"}
            >
              {showSettings ? '🏠' : '⚙️'}
            </button>
          </div>
        </div>
        {!showSettings && (
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
        )}
      </header>

      <main className="App-main">
        {showSettings ? (
          <div className="settings-container">
            <div className="settings-view-header">
              <h2>Settings</h2>
            </div>
            
            <section className="settings-section">
              <h3>Appearance</h3>
              <div className="setting-item">
                <label>Theme</label>
                <button 
                  className="dark-mode-toggle settings-inline-toggle"
                  onClick={() => setDarkMode(!darkMode)}
                >
                  {darkMode ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
                </button>
              </div>
            </section>

            <section className="settings-section">
              <h3>Quick Links</h3>
              <p>Configure the links shown in the top navigation bar.</p>
              <div className="quick-links-editor">
                {quickLinks.map((link) => (
                  <div key={link.id} className="link-edit-row">
                    <input 
                      type="text" 
                      value={link.title} 
                      onChange={(e) => handleLinkChange(link.id, 'title', e.target.value)}
                      placeholder="Link Title"
                    />
                    <input 
                      type="text" 
                      value={link.url} 
                      onChange={(e) => handleLinkChange(link.id, 'url', e.target.value)}
                      placeholder="URL"
                    />
                    <select 
                      value={link.colorClass} 
                      onChange={(e) => handleLinkChange(link.id, 'colorClass', e.target.value)}
                    >
                      <option value="sheet">Green (Sheet)</option>
                      <option value="gold">Orange (Gold)</option>
                      <option value="planer">Blue (Planer)</option>
                    </select>
                    <button className="remove-link-btn" onClick={() => handleRemoveLink(link.id)}>❌</button>
                  </div>
                ))}
                <button className="add-link-btn" onClick={handleAddLink}>+ Add Link</button>
              </div>
            </section>

            <section className="settings-section">
              <h3>Kunden-Tags auf der Hauptseite</h3>
              <p>Wähle aus, welche Informationen in der Kundenübersicht angezeigt werden sollen:</p>
              <div className="badge-settings-grid">
                <label className="badge-setting-card">
                  <input 
                    type="checkbox" 
                    checked={visibleBadges.discord} 
                    onChange={(e) => handleBadgeToggle('discord', e.target.checked)} 
                  />
                  <div className="badge-setting-label">
                    <strong>💬 Discord-ID / Tag</strong>
                    <small>Discord Name/ID in Kopfzeile & Seitenleiste</small>
                  </div>
                </label>
                <label className="badge-setting-card">
                  <input 
                    type="checkbox" 
                    checked={visibleBadges.battletag} 
                    onChange={(e) => handleBadgeToggle('battletag', e.target.checked)} 
                  />
                  <div className="badge-setting-label">
                    <strong>🎮 Battletag</strong>
                    <small>Blizzard Battletag in Kopfzeile & Seitenleiste</small>
                  </div>
                </label>
                <label className="badge-setting-card">
                  <input 
                    type="checkbox" 
                    checked={visibleBadges.origin} 
                    onChange={(e) => handleBadgeToggle('origin', e.target.checked)} 
                  />
                  <div className="badge-setting-label">
                    <strong>📍 Herkunft / Quelle</strong>
                    <small>Woher der Kunde kommt</small>
                  </div>
                </label>
                <label className="badge-setting-card">
                  <input 
                    type="checkbox" 
                    checked={visibleBadges.discount} 
                    onChange={(e) => handleBadgeToggle('discount', e.target.checked)} 
                  />
                  <div className="badge-setting-label">
                    <strong>🏷️ Stammkunden-Rabatt</strong>
                    <small>Rabatt-Prozente und Abzeichen</small>
                  </div>
                </label>
                <label className="badge-setting-card">
                  <input 
                    type="checkbox" 
                    checked={visibleBadges.notes} 
                    onChange={(e) => handleBadgeToggle('notes', e.target.checked)} 
                  />
                  <div className="badge-setting-label">
                    <strong>📝 Notiz-Vorschau</strong>
                    <small>Notiz-Ausschnitt & Notiz-Icon</small>
                  </div>
                </label>
              </div>
            </section>
          </div>
        ) : (
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

            <div className="customer-sort-bar">
              <select 
                id="customer-sort-select"
                value={sortMode} 
                onChange={handleSortChange}
                className="customer-sort-select"
              >
                <option value="custom">🖐️ Eigene (Drag & Drop)</option>
                <option value="name-asc">🔤 Name (A - Z)</option>
                <option value="name-desc">🔤 Name (Z - A)</option>
                <option value="id-desc">🕒 Neueste zuerst</option>
                <option value="id-asc">🕒 Älteste zuerst</option>
              </select>
            </div>

            {loading && customers.length === 0 && <p className="loading-text">Loading...</p>}
            
            {(() => {
              const { favList, nonFavList } = getSortedCustomers(customers);
              return (
                <ul className="customers-ul">
                  {favList.length > 0 && (
                    <li className="customer-group-header">
                      <span>⭐ Favoriten</span>
                      <span className="group-count">{favList.length}</span>
                    </li>
                  )}
                  {favList.map(customer => renderCustomerItem(customer, true))}

                  {nonFavList.length > 0 && favList.length > 0 && (
                    <li className="customer-group-header">
                      <span>👥 Alle Kunden</span>
                      <span className="group-count">{nonFavList.length}</span>
                    </li>
                  )}
                  {nonFavList.map(customer => renderCustomerItem(customer, false))}

                  {!loading && customers.length === 0 && <p className="empty-list-text">No customers found.</p>}
                </ul>
              );
            })()}
          </section>

          <section className="character-view">
            {openTabs.length > 0 && (
              <div className="customer-tabs-bar">
                <div className="customer-tabs-scroll">
                  {openTabs.map(tab => {
                    const isTabActive = activeCustomerId === tab.id;
                    const isTabFav = favorites.includes(tab.id);
                    return (
                      <div 
                        key={tab.id}
                        className={`customer-tab ${isTabActive ? 'active' : ''}`}
                        onClick={() => handleTabClick(tab)}
                        onAuxClick={(e) => handleTabAuxClick(e, tab.id)}
                        title={`${tab.name}${isTabFav ? ' (Favorit)' : ''} - Mittelklick zum Schließen`}
                      >
                        {isTabFav && <span className="tab-fav-badge">★</span>}
                        <span className="tab-title">{tab.name}</span>
                        <button 
                          type="button"
                          className="tab-close-btn"
                          onClick={(e) => handleCloseTab(e, tab.id)}
                          title="Register schließen"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                {openTabs.length > 1 && (
                  <button 
                    type="button"
                    className="tab-close-all-btn"
                    onClick={handleCloseAllTabs}
                    title="Alle Register schließen"
                  >
                    ✕ Alle schließen
                  </button>
                )}
              </div>
            )}

            {activeCustomer ? (
              <>
                <div className="view-header">
                  <div className="view-header-top-row">
                    <div className="view-header-title">
                      <h2>Characters for {activeCustomer.name}</h2>
                    </div>
                    <div className="header-actions">
                      <button 
                        type="button"
                        className="customer-notes-header-btn" 
                        onClick={() => openNotesModal(activeCustomer)}
                        title="Notizen, Herkunft & Rabatt für diesen Kunden bearbeiten"
                      >
                        📝 Notizen & Details
                      </button>
                      <button 
                        className="update-chars-btn" 
                        onClick={() => updateCustomerCharacters(activeCustomer)}
                        disabled={updatingCharacters}
                        title="Update GearScore and RIO for all characters"
                      >
                        {updatingCharacters ? '🔄 Updating...' : '🔄 Update Data'}
                      </button>
                      <button 
                        className="export-chars-btn" 
                        onClick={exportCharacters}
                        title="Copy characters to clipboard"
                      >
                        📋 Export
                      </button>
                    </div>
                  </div>

                  <div className="view-header-bottom-row">
                    <div className="customer-header-badges">
                      {visibleBadges.discord && activeCustomer.discordId && (
                        <span className="customer-badge discord-badge" title="Discord ID">
                          💬 {activeCustomer.discordId}
                        </span>
                      )}
                      {visibleBadges.battletag && activeCustomer.battletag && (
                        <span className="customer-badge battletag-badge" title="Battletag">
                          🎮 {activeCustomer.battletag}
                        </span>
                      )}
                      {visibleBadges.origin && activeCustomer.origin && (
                        <span className="customer-badge origin-badge" title="Herkunft / Woher">
                          📍 {activeCustomer.origin}
                        </span>
                      )}
                      {visibleBadges.discount && activeCustomer.discountPercent !== null && activeCustomer.discountPercent !== undefined && activeCustomer.discountPercent > 0 && (
                        <span className="customer-badge discount-badge" title="Stammkunden-Rabatt">
                          🏷️ {activeCustomer.discountPercent}% Rabatt
                        </span>
                      )}
                      {visibleBadges.notes && activeCustomer.notes && (
                        <span 
                          className="customer-badge notes-badge clickable" 
                          title={activeCustomer.notes}
                          onClick={() => openNotesModal(activeCustomer)}
                        >
                          📝 Notiz: {activeCustomer.notes.length > 40 ? activeCustomer.notes.substring(0, 40) + '...' : activeCustomer.notes}
                        </span>
                      )}

                      <div className="badge-settings-container">
                        <button 
                          type="button" 
                          className="badge-customize-toggle-btn"
                          onClick={(e) => { e.stopPropagation(); setShowBadgeMenu(!showBadgeMenu); }}
                          title="Sichtbare Tags auf der Mainpage anpassen"
                        >
                          🏷️ Tags ▾
                        </button>
                        {showBadgeMenu && (
                          <div className="badge-menu-popover" onClick={(e) => e.stopPropagation()}>
                            <div className="badge-menu-header">
                              <span>Angezeigte Tags</span>
                              <button type="button" className="badge-menu-close" onClick={() => setShowBadgeMenu(false)}>✕</button>
                            </div>
                            <label className="badge-menu-item">
                              <input 
                                type="checkbox" 
                                checked={visibleBadges.discord} 
                                onChange={(e) => handleBadgeToggle('discord', e.target.checked)} 
                              />
                              <span>💬 Discord-ID</span>
                            </label>
                            <label className="badge-menu-item">
                              <input 
                                type="checkbox" 
                                checked={visibleBadges.battletag} 
                                onChange={(e) => handleBadgeToggle('battletag', e.target.checked)} 
                              />
                              <span>🎮 Battletag</span>
                            </label>
                            <label className="badge-menu-item">
                              <input 
                                type="checkbox" 
                                checked={visibleBadges.origin} 
                                onChange={(e) => handleBadgeToggle('origin', e.target.checked)} 
                              />
                              <span>📍 Herkunft</span>
                            </label>
                            <label className="badge-menu-item">
                              <input 
                                type="checkbox" 
                                checked={visibleBadges.discount} 
                                onChange={(e) => handleBadgeToggle('discount', e.target.checked)} 
                              />
                              <span>🏷️ Rabatt</span>
                            </label>
                            <label className="badge-menu-item">
                              <input 
                                type="checkbox" 
                                checked={visibleBadges.notes} 
                                onChange={(e) => handleBadgeToggle('notes', e.target.checked)} 
                              />
                              <span>📝 Notizen</span>
                            </label>
                          </div>
                        )}
                      </div>
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
                      <button type="submit" disabled={loading}>+ Add Character</button>
                    </form>
                  </div>
                </div>
                {isActiveLoading && activeCharacters.length === 0 && <p>Loading characters...</p>}
                {!isActiveLoading && activeCharacters.length === 0 && <p>No characters found for this customer.</p>}
                <div className="character-grid">
                  {activeCharacters
                    .sort((a, b) => (b.rioAllScore || 0) - (a.rioAllScore || 0))
                    .map((char) => (
                    <div 
                      key={char.id} 
                      className="character-card"
                    >
                      <div className="char-info-main">
                        <div className="char-info-left">
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
                          <div className="char-details-row">
                            <span className="class-level">
                              {char.class ? `${char.class} (Level ${char.level})` : 'Daten werden geladen...'}
                            </span>
                            <span className="detail-separator">•</span>
                            <span className="realm-faction-wrapper">
                              {char.faction && (
                                <img 
                                  src={getFactionIcon(char.faction)} 
                                  alt={char.faction} 
                                  className="faction-icon"
                                  onError={(e) => e.target.style.display = 'none'}
                                />
                              )}
                              <span className="realm">{char.realm}{char.faction ? ` - ${char.faction}` : ''}</span>
                            </span>
                          </div>
                        </div>
                        <div className="char-actions-right">
                          {deletingCharId === char.id ? (
                            <>
                              <button 
                                className="confirm-delete-btn" 
                                onClick={(e) => handleDeleteCharacter(e, char.id)} 
                                title="Confirm delete"
                              >
                                ✅
                              </button>
                              <button 
                                className="cancel-delete-btn" 
                                onClick={(e) => { e.stopPropagation(); setDeletingCharId(null); }} 
                                title="Cancel delete"
                              >
                                ❌
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="export-single-btn" 
                                onClick={(e) => exportSingleCharacter(e, char)} 
                                title="Export this character"
                              >
                                📋
                              </button>
                              <button 
                                className="delete-single-btn" 
                                onClick={(e) => { e.stopPropagation(); setDeletingCharId(char.id); }} 
                                title="Delete this character"
                              >
                                🗑️
                              </button>
                            </>
                          )}
                        </div>
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
                <div className="empty-state-icon">👥</div>
                <h3>Kein Kunde geöffnet</h3>
                <p>Klicke auf einen Kunden in der linken Leiste, um ihn als Register zu öffnen.</p>
              </div>
            )}
          </section>
        </div>
        )}
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

      {notesModalCustomer && (
        <div className="notes-modal-overlay" onClick={closeNotesModal}>
          <div className="notes-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="notes-modal-header">
              <div className="notes-modal-title">
                <h3>📝 Notizen & Kundendaten</h3>
                <span className="notes-modal-cust-name">{notesModalCustomer.name}</span>
              </div>
              <button 
                type="button" 
                className="notes-modal-close-btn" 
                onClick={closeNotesModal}
                title="Schließen (Esc)"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomerNotes} className="notes-modal-form">
              <div className="notes-modal-body">
                {saveError && <div className="notes-modal-error-banner">{saveError}</div>}

                <div className="modal-section-group">
                  <span className="modal-section-heading">👤 Kundendaten</span>
                  <div className="modal-row three-col">
                    <div className="modal-field">
                      <label>Name</label>
                      <input 
                        type="text" 
                        value={modalName} 
                        onChange={(e) => setModalName(e.target.value)} 
                        required 
                        placeholder="Kundenname"
                      />
                    </div>
                    <div className="modal-field">
                      <label>Discord ID / Tag</label>
                      <input 
                        type="text" 
                        value={modalDiscord} 
                        onChange={(e) => setModalDiscord(e.target.value)} 
                        required 
                        placeholder="Discord Name/ID"
                      />
                    </div>
                    <div className="modal-field">
                      <label>Battletag (optional)</label>
                      <input 
                        type="text" 
                        value={modalBattletag} 
                        onChange={(e) => setModalBattletag(e.target.value)} 
                        placeholder="z.B. Spieler#1234"
                      />
                    </div>
                  </div>
                </div>

                <div className="modal-section-group">
                  <span className="modal-section-heading">📍 Herkunft & 🏷️ Rabatt</span>
                  <div className="modal-row two-col">
                    <div className="modal-field">
                      <label>Herkunft / Quelle</label>
                      <input 
                        type="text" 
                        value={modalOrigin} 
                        onChange={(e) => setModalOrigin(e.target.value)} 
                        placeholder="z.B. Server XY, Bekannter, Forum, Ingame..."
                      />
                      <span className="field-hint">Kanal, Server oder Kontakt (z.B. Bekannter, Ingame)</span>
                    </div>

                    <div className="modal-field">
                      <label>Rabatt (%)</label>
                      <div className="discount-input-row">
                        <input 
                          type="number" 
                          min="0" 
                          max="100" 
                          step="1"
                          value={modalDiscount} 
                          onChange={(e) => setModalDiscount(e.target.value)} 
                          placeholder="0"
                          className="discount-num-input"
                        />
                        <span className="discount-percent-symbol">%</span>
                      </div>
                      <div className="discount-quick-pills">
                        {[0, 5, 10, 15, 20, 25].map(pct => (
                          <button
                            key={pct}
                            type="button"
                            className={`discount-pill-btn ${(modalDiscount === '' && pct === 0) || parseFloat(modalDiscount) === pct ? 'selected' : ''}`}
                            onClick={() => setModalDiscount(pct === 0 ? '' : pct.toString())}
                          >
                            {pct === 0 ? '0%' : `${pct}%`}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-section-group">
                  <span className="modal-section-heading">📋 Notizen & Vereinbarungen</span>
                  <div className="modal-field">
                    <textarea 
                      rows={6}
                      value={modalNotes}
                      onChange={(e) => setModalNotes(e.target.value)}
                      placeholder="Hier kannst du beliebige Notizen eintragen (z.B. bevorzugte Zeiten/Tage, Zahlungsmodalitäten, Besonderheiten, Termine, Absprachen)..."
                      className="modal-notes-textarea"
                    />
                  </div>
                </div>
              </div>

              <div className="notes-modal-footer">
                <button 
                  type="button" 
                  className="modal-btn-cancel" 
                  onClick={closeNotesModal}
                  disabled={savingNotes}
                >
                  Abbrechen
                </button>
                <button 
                  type="submit" 
                  className="modal-btn-save" 
                  disabled={savingNotes}
                >
                  {savingNotes ? '💾 Speichere...' : '💾 Änderungen speichern'}
                </button>
              </div>
            </form>
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
