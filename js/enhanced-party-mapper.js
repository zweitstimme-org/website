/**
 * Enhanced Party Mapper for Website
 * Handles historical parties, state-specific parties, and time-based inclusion
 */

class EnhancedPartyMapper {
    constructor() {
        // Core party mappings (always included)
        this.coreParties = new Set(['CDU/CSU', 'SPD', 'GRÜNE', 'FDP', 'LINKE', 'AfD', 'BSW']);
        
        // Historical parties with their active periods
        this.historicalParties = {
            'PIRATEN': {
                activeYears: [2011, 2012, 2013, 2014, 2015, 2016, 2019, 2024],
                minPolls: 10,
                states: ['federal'],
                aliases: ['Piraten', 'PIRATEN']
            },
            'Freie Wähler': {
                activeYears: [2012, 2013, 2014, 2015, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
                minPolls: 10,
                states: ['federal', 'bayern', 'brandenburg', 'baden-württemberg', 'hessen', 'niedersachsen', 'nordrhein-westfalen', 'rheinland-pfalz', 'saarland', 'sachsen', 'sachsen-anhalt', 'thüringen'],
                aliases: ['Freie Wähler', 'FW', 'BVB/FW']
            },
            'SSW': {
                activeYears: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025],
                minPolls: 10,
                states: ['schleswig-holstein', 'SH'],
                aliases: ['SSW']
            },
            'REP': {
                activeYears: [1998, 1999, 2000, 2001, 2002, 2003, 2004, 2005, 2006],
                minPolls: 10,
                states: ['federal'],
                aliases: ['REP']
            }
        };
        
        // Party color mapping
        this.partyColors = {
            'CDU/CSU': '#000000',
            'CDU': '#000000',
            'CSU': '#000000',
            'SPD': '#E3000F',
            'GRÜNE': '#46962b',
            'FDP': '#FFED00',
            'LINKE': '#BE3075',
            'AfD': '#009EE0',
            'BSW': '#FF6B35',
            'Freie Wähler': '#FF6600',
            'PIRATEN': '#FF8800',
            'SSW': '#003D8F',
            'REP': '#8B4513',
            'Sonstige': '#666666'
        };
    }
    
    /**
     * Check if a party is active in a specific year and state
     */
    isPartyActiveInPeriod(partyName, year, state = 'federal') {
        // Core parties are always active
        if (this.coreParties.has(partyName)) {
            return true;
        }
        
        // Check historical parties
        if (partyName in this.historicalParties) {
            const partyInfo = this.historicalParties[partyName];
            
            // Check year
            if (!partyInfo.activeYears.includes(year)) {
                return false;
            }
            
            // Check state
            if (!partyInfo.states.includes(state) && !partyInfo.states.includes('federal')) {
                return false;
            }
            
            return true;
        }
        
        return false;
    }
    
    /**
     * Get all parties that should be active for a specific period
     */
    getActivePartiesForPeriod(year, state = 'federal') {
        const activeParties = new Set();
        
        // Add core parties
        for (const party of this.coreParties) {
            activeParties.add(party);
        }
        
        // Add historical parties that are active
        for (const [partyName, partyInfo] of Object.entries(this.historicalParties)) {
            if (this.isPartyActiveInPeriod(partyName, year, state)) {
                activeParties.add(partyName);
            }
        }
        
        return activeParties;
    }
    
    /**
     * Get ordered list of parties for a specific period
     */
    getPartyOrderForPeriod(year, state = 'federal') {
        const activeParties = this.getActivePartiesForPeriod(year, state);
        
        // Define standard order
        const standardOrder = [
            'CDU/CSU', 'SPD', 'GRÜNE', 'FDP', 'LINKE', 'AfD', 'BSW',
            'Freie Wähler', 'PIRATEN', 'SSW', 'REP', 'Sonstige'
        ];
        
        // Filter to only include active parties
        return standardOrder.filter(party => activeParties.has(party));
    }
    
    /**
     * Get party color
     */
    getPartyColor(partyName) {
        return this.partyColors[partyName] || '#888888';
    }
    
    /**
     * Get colors for a list of parties
     */
    getPartyColors(parties) {
        return parties.map(party => this.getPartyColor(party));
    }
    
    /**
     * Filter poll data to only include parties active in the poll's time period
     */
    filterPollDataByPeriod(pollData, pollDate, state = 'federal') {
        const year = new Date(pollDate).getFullYear();
        const activeParties = this.getActivePartiesForPeriod(year, state);
        
        const filteredData = {};
        for (const [party, value] of Object.entries(pollData)) {
            if (activeParties.has(party)) {
                filteredData[party] = value;
            }
        }
        
        return filteredData;
    }
    
    /**
     * Get party information for display
     */
    getPartyInfo(partyName) {
        if (this.coreParties.has(partyName)) {
            return {
                name: partyName,
                type: 'core',
                color: this.getPartyColor(partyName),
                activeYears: 'Always active',
                states: 'All states'
            };
        }
        
        if (partyName in this.historicalParties) {
            const info = this.historicalParties[partyName];
            return {
                name: partyName,
                type: 'historical',
                color: this.getPartyColor(partyName),
                activeYears: `${Math.min(...info.activeYears)}-${Math.max(...info.activeYears)}`,
                states: info.states.join(', ')
            };
        }
        
        return {
            name: partyName,
            type: 'other',
            color: this.getPartyColor(partyName),
            activeYears: 'Unknown',
            states: 'Unknown'
        };
    }
}

// Create global instance
window.enhancedPartyMapper = new EnhancedPartyMapper();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = EnhancedPartyMapper;
}
