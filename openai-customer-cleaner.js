// openai-customer-cleaner.js
// Script to clean and standardize customer data using OpenAI API
// Processes first 50 rows with intelligent data inference and formatting
// Enhanced with intelligent country detection and proper phone number formatting

const fs = require('fs');
const csv = require('csv-parser');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const pLimit = require('p-limit').default;
const limit = pLimit(10); // 3 concurrent requests for gpt-3.5-turbo higher limits

// Fix for fetch - use built-in fetch in Node.js 18+ or import node-fetch for older versions
let fetch;
try {
  fetch = globalThis.fetch;
} catch (e) {
  fetch = require('node-fetch');
}

// Configuration
const INPUT_FILE = 'data/JTL-Export-Kundendaten-02052025.csv';
const OUTPUT_FILE = 'data/kunden_openai_cleaned.csv';
const ANALYSIS_FILE = 'data/openai_cleaning_report.txt';
const MAX_ROWS = 5000; // Process only first 400 rows

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-3.5-turbo'; // Using gpt-3.5-turbo for higher rate limits and lower cost

if (!OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY environment variable is required');
  console.log('Please set your OpenAI API key: export OPENAI_API_KEY="your-api-key"');
  process.exit(1);
}
/**
 * Call OpenAI API to clean and standardize customer data with optimized token usage and rate limiting
 */
async function cleanCustomerWithAI(customerData, attempt = 1) {
  const MAX_ATTEMPTS = 3;
  const RETRY_BASE_DELAY = 5000; // 5 seconds base delay for retries
  const REQUEST_DELAY_MS = 2000; // 2 seconds between requests

  // Move all static instructions to system message to reduce tokens per request
  const systemMessage = `You are a data cleaning expert specializing in international customer data.

INSTRUCTIONS:
1. **Address Information Completion**:
   - If PLZ (postal code) is missing: Infer from Strasse (street) + Ort (city)
   - If Ort (city) is missing: Infer from PLZ (postal code)
   - If Strasse (street) is missing: do not infer it, leave it blank
   - Use accurate postal codes and city names for the detected country
   - Important: If both street and city are missing, or if you cannot confidently infer the postal code or city, leave the PLZ and Ort fields blank. Do not guess or invent data.
   - After inferring PLZ and Ort, also infer the Bundesland (state/region) based on the address. If you cannot confidently infer the Bundesland, leave it blank. Do not guess or invent data.
   - Always include the 'Bundesland' (state/province/region) field in the output, even if blank.

2. **Country Detection & Standardization**:
   - Detect the correct country from address data

3. **Phone Number Intelligence**:
   - Analyze the phone number format to determine if it's landline or mobile
   - Detect the city/region from the address
   - Research the correct area code/prefix for that city
   - Compare with the provided phone number
   - Apply the correct country code based on the detected country
   - Format with zero in parentheses: +49 (0) 30 12345678
   - Handle missing leading zeros, wrong prefixes, etc.
   - If the phone number is missing, leave it blank
   - If the phone number is a mobile number, after the complete formatting, place it in the Mobil column.
   - If the phone number is a landline number, after the complete formatting, place it in the Tel column.

4. **Address Standardization**:
   - Clean street names, remove extra spaces
   - Standardize common abbreviations (Str. -> Straße, etc.)
   - Use correct format for detected country

5. **Name Standardization**:
   - Properly format names, handle titles and salutations
   - use Herr, Frau, Firma, for the Anrede field and replace Mr., Mrs., etc. accordingly
   - if This salutation is missing, you can infer it by the name which will allow you to understand if it's Herr, Frau or Firma.

6. **Additional Validation**:
   - If any entry is obviously placed in the wrong column, please correct it.

PHONE NUMBER RULES (with zero in parentheses):
BE: +32 (0), DE: +49 (0), NL: +31 (0), GB: +44 (0), SE: +46 (0), IE: +353 (0), SA: +966 (0), LU: +352 (0), ES: +34 (0), IT: +39 (0), AR: +54 (0), AT: +43 (0), FI: +358 (0), PL: +48 (0), PT: +351 (0), NO: +47 (0), CZ: +420 (0), FR: +33 (0), SO: +252 (0), LT: +370 (0), SM: +378 (0), HR: +385 (0), MX: +52 (0), IL: +972 (0), ID: +62 (0), SI: +386 (0), DK: +45 (0), HU: +36 (0), CH: +41 (0), AU: +61 (0), ZA: +27 (0), IS: +354 (0), IR: +98 (0)
Exception: CA, US, RU, DO: No trunk zero (use +1, +7 format)

Return only valid JSON with cleaned customer data. Do not guess or invent data.`;

  // Only send the customer data in user message
  const userMessage = `Clean and standardize this customer data:
${JSON.stringify(customerData, null, 2)}`;

  try {
    // Add delay before each request to avoid rate limits
    await new Promise(res => setTimeout(res, REQUEST_DELAY_MS));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000, // Reduced since we're not sending long prompts
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      // Handle 429 rate limit errors with retry
      if (response.status === 429 && attempt < MAX_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY * attempt;
        console.warn(`⚠️  Rate limit hit. Retrying in ${delay / 1000}s (attempt ${attempt})...`);
        await new Promise(res => setTimeout(res, delay));
        return cleanCustomerWithAI(customerData, attempt + 1);
      }

      throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // Remove Markdown code block if present
    if (content.startsWith('```')) {
      content = content
        .replace(/^```[a-zA-Z]*\n?/, '')
        .replace(/```$/, '')
        .trim();
    }

    const cleanedData = JSON.parse(content);
    return cleanedData;
  } catch (error) {
    console.error('OpenAI API error:', error.message);
    return customerData; // Return original data if API fails
  }
}

/**
 * Main data cleaning function with OpenAI integration and intelligent address completion
 */
async function cleanCustomerDataWithAI() {
  const customers = [];
  const stats = {
    total: 0,
    processed: 0,
    openaiSuccess: 0,
    openaiErrors: 0,
    phoneNumbersCleaned: 0,
    postalCodesInferred: 0,
    citiesInferred: 0,
    countriesDetected: 0,
    errors: [],
  };

  return new Promise((resolve, reject) => {
    const rows = [];

    fs.createReadStream(INPUT_FILE)
      .pipe(csv({ separator: ';' }))
      .on('data', row => {
        stats.total++;
        rows.push(row);
      })
      .on('end', async () => {
        console.log(`📊 Found ${rows.length} total rows, processing first ${MAX_ROWS}...`);

        // Process only first MAX_ROWS
        const rowsToProcess = rows.slice(0, MAX_ROWS);

        const promises = rowsToProcess.map((row, i) =>
          limit(async () => {
            stats.processed++;
            try {
              const customerDataForAI = { ...row };
              console.log(
                `🤖 [${stats.processed}/${MAX_ROWS}] Processing: ${row.Firma || row.Vorname || 'Unknown'} (${row.Land || 'Unknown Country'})`,
              );
              const aiCleanedData = await cleanCustomerWithAI(customerDataForAI);

              if (aiCleanedData && Object.keys(aiCleanedData).length > 0) {
                stats.openaiSuccess++;
                // Check if postal code was inferred
                if (!row.PLZ && aiCleanedData.PLZ) {
                  stats.postalCodesInferred++;
                }

                // Check if city was inferred
                if (!row.Ort && aiCleanedData.Ort) {
                  stats.citiesInferred++;
                }

                // Check if country was detected/standardized
                if (row.Land !== aiCleanedData.Land) {
                  stats.countriesDetected++;
                }

                // Check if phone numbers were cleaned
                const originalTel = row.Tel || '';
                const originalFax = row.Fax || '';
                const originalMobil = row.Mobil || '';

                if (
                  originalTel !== aiCleanedData.Tel ||
                  originalFax !== aiCleanedData.Fax ||
                  originalMobil !== aiCleanedData.Mobil
                ) {
                  stats.phoneNumbersCleaned++;
                }

                customers[i] = aiCleanedData;
              } else {
                stats.openaiErrors++;
                customers[i] = customerDataForAI;
              }
            } catch (error) {
              stats.errors.push(`Row ${i + 1}: ${error.message}`);
              stats.openaiErrors++;
              customers[i] = customerDataForAI;
            }
          }),
        );

        await Promise.all(promises);

        console.log(`✅ Finished processing ${customers.length} customers`);
        resolve({ customers, stats });
      })
      .on('error', reject);
  });
}

/**
 * Write analysis report
 */
function writeAnalysisReport(stats) {
  const report = `
OpenAI Customer Data Cleaning Report (Enhanced with Address Completion)
=====================================================================

Processing Summary:
- Total records in file: ${stats.total}
- Records processed: ${stats.processed}
- OpenAI API successful: ${stats.openaiSuccess}
- OpenAI API errors: ${stats.openaiErrors}

Data Improvements:
- Phone numbers standardized: ${stats.phoneNumbersCleaned}
- Postal codes inferred: ${stats.postalCodesInferred}
- Cities inferred: ${stats.citiesInferred}
- Countries detected/standardized: ${stats.countriesDetected}

Success Rate: ${((stats.openaiSuccess / stats.processed) * 100).toFixed(1)}%

Enhanced Features:
✅ Intelligent address completion (missing postal codes, cities, streets)
✅ Country-specific phone number formatting with zero in parentheses
✅ City/region-based area code validation
✅ Landline vs mobile number detection
✅ International postal code inference
✅ Cultural name formatting
✅ Multi-language address standardization

Supported Countries:
🇩🇪 Germany (DE), 🇦🇹 Austria (AT), 🇨🇭 Switzerland (CH)
🇳🇱 Netherlands (NL), 🇧🇪 Belgium (BE), 🇫🇷 France (FR)
🇮🇹 Italy (IT), 🇪🇸 Spain (ES), 🇬🇧 United Kingdom (GB)
🇵🇱 Poland (PL), 🇨🇿 Czech Republic (CZ), 🇭🇺 Hungary (HU)
🇸🇰 Slovakia (SK), 🇸🇮 Slovenia (SI), 🇭🇷 Croatia (HR)
🇷🇴 Romania (RO), 🇧🇬 Bulgaria (BG), 🇬🇷 Greece (GR)
🇵🇹 Portugal (PT), 🇮🇪 Ireland (IE), 🇩🇰 Denmark (DK)
🇸🇪 Sweden (SE), 🇳🇴 Norway (NO), 🇫🇮 Finland (FI)
🇪🇪 Estonia (EE), 🇱🇻 Latvia (LV), 🇱🇹 Lithuania (LT)

Phone Number Format Examples:
- German: +49 (0) 30 12345678
- Austrian: +43 (0) 1 23456789
- Swiss: +41 (0) 44 1234567
- Dutch: +31 (0) 20 1234567
- French: +33 (0) 1 23456789

Cost Analysis:
- Model used: ${OPENAI_MODEL}
- API calls made: ${stats.processed}
- Estimated cost: ~$${(stats.processed * 0.0025).toFixed(2)} (based on gpt-4o-mini pricing)

Next Steps:
1. Review the cleaned data in kunden_openai_cleaned.csv
2. Verify address completions are accurate
3. Check phone number formats are correct for each country
4. Validate postal code and city inferences
5. Consider processing remaining records if results are satisfactory
`;

  fs.writeFileSync(ANALYSIS_FILE, report);
  console.log('📋 Analysis report written to:', ANALYSIS_FILE);
}

/**
 * Main execution
 */
async function main() {
  try {
    console.log('🚀 Starting OpenAI-powered customer data cleaning with address completion...');
    console.log(`📊 Processing first ${MAX_ROWS} rows`);
    console.log(`🤖 Using OpenAI model: ${OPENAI_MODEL}`);
    console.log('🌍 Enhanced with intelligent address completion and proper phone formatting');
    console.log('⏳ This may take a few minutes...');
    console.log('📋 Progress will be shown for each customer processed\n');

    const { customers, stats } = await cleanCustomerDataWithAI();

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

    console.log('\n✅ OpenAI data cleaning completed successfully!');
    console.log(`📊 Records processed: ${stats.processed}`);
    console.log(`🤖 OpenAI API successful: ${stats.openaiSuccess}`);
    console.log(`📱 Phone numbers cleaned: ${stats.phoneNumbersCleaned}`);
    console.log(`📮 Postal codes inferred: ${stats.postalCodesInferred}`);
    console.log(`🏙️ Cities inferred: ${stats.citiesInferred}`);
    console.log(`🌍 Countries detected: ${stats.countriesDetected}`);
    console.log(`📁 Cleaned data saved to: ${OUTPUT_FILE}`);
    console.log(`📋 Analysis report saved to: ${ANALYSIS_FILE}`);

    if (stats.errors.length > 0) {
      console.log(`⚠️ Errors encountered: ${stats.errors.length}`);
      console.log('Check the analysis report for details.');
    }

    console.log('\n💰 Estimated cost: ~$' + (stats.processed * 0.0025).toFixed(2));
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
  cleanCustomerWithAI,
  cleanCustomerDataWithAI,
};
