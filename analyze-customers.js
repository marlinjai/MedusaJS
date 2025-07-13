const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const libphonenumber = require('google-libphonenumber');
const phoneUtil = libphonenumber.PhoneNumberUtil.getInstance();

// Fix for fetch - use built-in fetch in Node.js 18+ or import node-fetch for older versions
let fetch;
try {
  // Try to use built-in fetch (Node.js 18+)
  fetch = globalThis.fetch;
} catch (e) {
  // Fallback to node-fetch for older Node.js versions
  fetch = require('node-fetch');
}

// Configuration
const INPUT_FILE = 'data/JTL-Export-Kundendaten-02052025.csv';
const OUTPUT_FILE = 'data/kunden_cleaned_enhanced.csv';
const ANALYSIS_FILE = 'data/analysis_report_enhanced.txt';

// Replace with your GeoNames username
const GEONAMES_USERNAME = 'marlinjai';

/**
 * Enhanced phone number cleaning using google-libphonenumber library
 */
function enhancedCleanPhoneNumber(phone, countryCode = 'DE') {
  if (!phone || typeof phone !== 'string') return '';

  // Remove all whitespace and convert to string
  let cleaned = phone.toString().replace(/\s+/g, '');

  // Handle empty or invalid entries
  if (cleaned === '' || cleaned === 'null' || cleaned === 'undefined') return '';

  // Try google-libphonenumber first (handles international formats)
  try {
    const parsed = phoneUtil.parse(cleaned, countryCode);
    if (phoneUtil.isValidNumber(parsed)) {
      return phoneUtil.format(parsed, libphonenumber.PhoneNumberFormat.E164);
    }
  } catch (e) {
    // Fall back to manual cleaning if libphonenumber fails
  }

  // Remove common prefixes and suffixes
  cleaned = cleaned.replace(/^(tel|telefon|phone|mobil|mobile|fax):/i, '');
  cleaned = cleaned.replace(/^(tel|telefon|phone|mobil|mobile|fax)\s+/i, '');

  // Remove brackets, parentheses, and other common separators
  cleaned = cleaned.replace(/[()\[\]{}]/g, '');
  cleaned = cleaned.replace(/[\/\-\.\s]/g, '');

  // Handle international prefixes
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.substring(2);
  }

  // Handle German numbers with various formats
  if (cleaned.startsWith('0')) {
    // German mobile numbers (015x, 016x, 017x)
    if (cleaned.match(/^0(15|16|17)\d{8,9}$/)) {
      return '+49' + cleaned.substring(1);
    }
    // German landline numbers
    if (cleaned.match(/^0\d{2,5}\d{6,8}$/)) {
      return '+49' + cleaned.substring(1);
    }
  }

  // Handle international numbers starting with +
  if (cleaned.startsWith('+')) {
    // Validate international format
    if (cleaned.match(/^\+\d{7,15}$/)) {
      return cleaned;
    }
  }

  // Handle numbers without country code (assume German if starts with 0)
  if (cleaned.match(/^0\d{8,12}$/)) {
    return '+49' + cleaned.substring(1);
  }

  // Handle numbers that might be missing leading zeros
  if (cleaned.match(/^1[567]\d{8}$/)) {
    return '+49' + cleaned;
  }

  // Handle various international formats
  const internationalPatterns = [
    /^(\+31|0031)\d{8,10}$/, // Netherlands
    /^(\+32|0032)\d{8,10}$/, // Belgium
    /^(\+33|0033)\d{8,10}$/, // France
    /^(\+34|0034)\d{8,10}$/, // Spain
    /^(\+351|00351)\d{8,10}$/, // Portugal
    /^(\+352|00352)\d{8,10}$/, // Luxembourg
    /^(\+354|00354)\d{7,9}$/, // Iceland
    /^(\+358|00358)\d{8,10}$/, // Finland
    /^(\+36|0036)\d{8,10}$/, // Hungary
    /^(\+385|00385)\d{8,10}$/, // Croatia
    /^(\+39|0039)\d{8,10}$/, // Italy
    /^(\+41|0041)\d{8,10}$/, // Switzerland
    /^(\+420|00420)\d{8,10}$/, // Czech Republic
    /^(\+43|0043)\d{8,10}$/, // Austria
    /^(\+44|0044)\d{8,10}$/, // UK
    /^(\+45|0045)\d{7,9}$/, // Denmark
    /^(\+46|0046)\d{8,10}$/, // Sweden
    /^(\+47|0047)\d{7,9}$/, // Norway
    /^(\+48|0048)\d{8,10}$/, // Poland
    /^(\+49|0049)\d{8,12}$/, // Germany
  ];

  for (const pattern of internationalPatterns) {
    if (pattern.test(cleaned)) {
      // Convert 00 prefix to +
      if (cleaned.startsWith('00')) {
        return '+' + cleaned.substring(2);
      }
      return cleaned;
    }
  }

  // If it looks like a valid number but doesn't match patterns, return as is
  if (cleaned.match(/^\d{7,15}$/)) {
    return cleaned;
  }

  // If it's too short or too long, return empty
  if (cleaned.length < 7 || cleaned.length > 15) {
    return '';
  }

  return cleaned;
}

/**
 * Get region/state using GeoNames API for all countries
 */
async function getRegionFromGeoNames(city, country) {
  if (!city || !country) return '';

  try {
    const url = `http://api.geonames.org/searchJSON?q=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}&maxRows=1&username=${GEONAMES_USERNAME}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.geonames && data.geonames.length > 0) {
      // Try to get the adminName1 (state/region)
      return data.geonames[0].adminName1 || '';
    }
  } catch (error) {
    console.error('GeoNames API error:', error.message);
  }

  return '';
}

/**
 * Enhanced Bundesland/region detection using GeoNames for all countries
 */
async function inferBundesland(city, plz, land) {
  // Only apply if we have city and country data
  if (!city || !land) return '';

  // Use GeoNames for all countries (including Germany)
  const region = await getRegionFromGeoNames(city, land);

  if (region) {
    return region;
  }

  return '';
}

/**
 * Main data cleaning function
 */
async function cleanCustomerData() {
  const customers = [];
  const stats = {
    total: 0,
    missingBundesland: 0,
    phoneNumbersCleaned: 0,
    geoNamesFound: 0,
    errors: [],
  };

  return new Promise((resolve, reject) => {
    fs.createReadStream(INPUT_FILE)
      .pipe(csv({ separator: ';' }))
      .on('data', async row => {
        try {
          stats.total++;

          // Clean phone numbers with enhanced library
          const originalTel = row.Tel || '';
          const originalFax = row.Fax || '';
          const originalMobil = row.Mobil || '';

          const cleanedTel = enhancedCleanPhoneNumber(originalTel);
          const cleanedFax = enhancedCleanPhoneNumber(originalFax);
          const cleanedMobil = enhancedCleanPhoneNumber(originalMobil);

          if (cleanedTel !== originalTel || cleanedFax !== originalFax || cleanedMobil !== originalMobil) {
            stats.phoneNumbersCleaned++;
          }

          // Enhanced Bundesland detection using GeoNames
          const originalBundesland = row.Bundesland || '';
          let bundesland = originalBundesland;

          if (!bundesland) {
            bundesland = await inferBundesland(row.Ort, row.PLZ, row.Land);
            if (bundesland) {
              stats.missingBundesland++;
              stats.geoNamesFound++;
            }
          }

          // Create cleaned row
          const cleanedRow = {
            ...row,
            Tel: cleanedTel,
            Fax: cleanedFax,
            Mobil: cleanedMobil,
            Bundesland: bundesland,
          };

          customers.push(cleanedRow);
        } catch (error) {
          stats.errors.push(`Row ${stats.total}: ${error.message}`);
        }
      })
      .on('end', () => {
        resolve({ customers, stats });
      })
      .on('error', reject);
  });
}

/**
 * Write enhanced analysis report
 */
function writeAnalysisReport(stats) {
  const report = `
Enhanced Customer Data Cleaning Report
=====================================

Total records processed: ${stats.total}
Missing Bundesland filled: ${stats.missingBundesland} (${((stats.missingBundesland / stats.total) * 100).toFixed(1)}%)
  - GeoNames API found: ${stats.geoNamesFound}
Phone numbers standardized: ${stats.phoneNumbersCleaned} (${((stats.phoneNumbersCleaned / stats.total) * 100).toFixed(1)}%)

Data Quality Improvements:
- Enhanced phone number cleaning using google-libphonenumber library
- International region detection using GeoNames API for all countries

Libraries Used:
- google-libphonenumber: International phone number parsing and validation
- GeoNames API: International city to region/state mapping

Next Steps:
1. Review the cleaned data in kunden_cleaned_enhanced.csv
2. Verify phone number formats are correct
3. Check that Bundesland/region assignments are accurate
4. Consider AI enhancement for remaining problematic records
`;

  fs.writeFileSync(ANALYSIS_FILE, report);
  console.log('Enhanced analysis report written to:', ANALYSIS_FILE);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting enhanced customer data cleaning...');
    console.log('📚 Using libraries: google-libphonenumber, GeoNames API');

    const { customers, stats } = await cleanCustomerData();

    // Write cleaned data
    const csvWriter = createCsvWriter({
      path: OUTPUT_FILE,
      header: [
        { id: 'Kundennummer', title: 'Kundennummer' },
        { id: 'Interner Schlüssel', title: 'Interner Schlüssel' },
        { id: 'Kundengruppe', title: 'Kundengruppe' },
        { id: 'Sprache', title: 'Sprache' },
        { id: 'Anrede', title: 'Anrede' },
        { id: 'Titel', title: 'Titel' },
        { id: 'Vorname', title: 'Vorname' },
        { id: 'Nachname', title: 'Nachname' },
        { id: 'Firma', title: 'Firma' },
        { id: 'Firmenzusatz', title: 'Firmenzusatz' },
        { id: 'Strasse', title: 'Strasse' },
        { id: 'Adresszusatz', title: 'Adresszusatz' },
        { id: 'PLZ', title: 'PLZ' },
        { id: 'Ort', title: 'Ort' },
        { id: 'Bundesland', title: 'Bundesland' },
        { id: 'Land', title: 'Land' },
        { id: 'Tel', title: 'Tel' },
        { id: 'Fax', title: 'Fax' },
        { id: 'Mobil', title: 'Mobil' },
        { id: 'E-Mail', title: 'E-Mail' },
        { id: 'Homepage (WWW)', title: 'Homepage (WWW)' },
        { id: 'Geburtstag', title: 'Geburtstag' },
        { id: 'eBay-Name', title: 'eBay-Name' },
        { id: 'Ust-ID', title: 'Ust-ID' },
        { id: 'Steuernummer', title: 'Steuernummer' },
      ],
      fieldDelimiter: ';',
    });

    await csvWriter.writeRecords(customers);

    // Write analysis report
    writeAnalysisReport(stats);

    console.log('\n✅ Enhanced data cleaning completed successfully!');
    console.log(`📊 Total records processed: ${stats.total}`);
    console.log(`🏛️ Missing Bundesland filled: ${stats.missingBundesland}`);
    console.log(` GeoNames API found: ${stats.geoNamesFound}`);
    console.log(`📱 Phone numbers standardized: ${stats.phoneNumbersCleaned}`);
    console.log(` Cleaned data saved to: ${OUTPUT_FILE}`);
    console.log(`📋 Analysis report saved to: ${ANALYSIS_FILE}`);

    if (stats.errors.length > 0) {
      console.log(`⚠️ Errors encountered: ${stats.errors.length}`);
      console.log('Check the analysis report for details.');
    }
  } catch (error) {
    console.error('❌ Error during data cleaning:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = {
  enhancedCleanPhoneNumber,
  getRegionFromGeoNames,
  inferBundesland,
  cleanCustomerData,
};
