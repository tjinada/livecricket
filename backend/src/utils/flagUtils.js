/**
 * Mapping from cricket team codes to ISO 3166-1 alpha-2 country codes
 * Used for auto-populating flag URLs from flagicons.lipis.dev
 */
const cricketCodeToISO = {
  // Full members
  'AUS': 'au',   // Australia
  'IND': 'in',   // India
  'ENG': 'gb',   // England (Great Britain)
  'PAK': 'pk',   // Pakistan
  'NZ': 'nz',    // New Zealand
  'SA': 'za',    // South Africa
  'SL': 'lk',    // Sri Lanka
  'BAN': 'bd',   // Bangladesh
  'AFG': 'af',   // Afghanistan
  'WI': 'jm',    // West Indies (using Jamaica as representative)
  'ZIM': 'zw',   // Zimbabwe
  'IRE': 'ie',   // Ireland
  
  // Associate members
  'SCO': 'gb-sct', // Scotland
  'NED': 'nl',   // Netherlands
  'NAM': 'na',   // Namibia
  'UAE': 'ae',   // United Arab Emirates
  'USA': 'us',   // United States
  'CAN': 'ca',   // Canada
  'KEN': 'ke',   // Kenya
  'NEP': 'np',   // Nepal
  'OMA': 'om',   // Oman
  'PNG': 'pg',   // Papua New Guinea
  'HK': 'hk',    // Hong Kong
  'SGP': 'sg',   // Singapore
  'MYS': 'my',   // Malaysia
  'UGA': 'ug',   // Uganda
  'TAN': 'tz',   // Tanzania
  'JPN': 'jp',   // Japan
  'CHN': 'cn',   // China
  'ARG': 'ar',   // Argentina
  'BER': 'bm',   // Bermuda
  'GER': 'de',   // Germany
  'ITA': 'it',   // Italy
  'JER': 'je',   // Jersey
  'GUE': 'gg',   // Guernsey
  
  // Additional codes (2-letter codes that match ISO)
  'AU': 'au',
  'IN': 'in',
  'GB': 'gb',
  'PK': 'pk',
  'LK': 'lk',
  'BD': 'bd',
  'ZA': 'za',
  'US': 'us',
  'CA': 'ca',
  'NL': 'nl',
  'AE': 'ae',
  'AF': 'af',
  'ZW': 'zw',
  'IE': 'ie',
  'JP': 'jp',
  'DE': 'de',
};

/**
 * Get flag URL for a cricket team code
 * @param {string} cricketCode - The cricket team code (e.g., 'AUS', 'IND')
 * @param {string} format - Flag format: '4x3' (default) or '1x1'
 * @returns {string|null} - The flag URL or null if not found
 */
function getFlagUrl(cricketCode, format = '4x3') {
  if (!cricketCode) return null;
  
  const upperCode = cricketCode.toUpperCase();
  const isoCode = cricketCodeToISO[upperCode];
  
  if (!isoCode) {
    // Try using the code directly if it's already 2 letters
    if (cricketCode.length === 2) {
      return `https://flagicons.lipis.dev/flags/${format}/${cricketCode.toLowerCase()}.svg`;
    }
    return null;
  }
  
  return `https://flagicons.lipis.dev/flags/${format}/${isoCode}.svg`;
}

/**
 * Get ISO code from cricket code
 * @param {string} cricketCode - The cricket team code
 * @returns {string|null} - The ISO code or null
 */
function getISOCode(cricketCode) {
  if (!cricketCode) return null;
  return cricketCodeToISO[cricketCode.toUpperCase()] || null;
}

module.exports = {
  cricketCodeToISO,
  getFlagUrl,
  getISOCode
};
