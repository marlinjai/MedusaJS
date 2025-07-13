# OpenAI Customer Data Cleaner

This script uses OpenAI's GPT-4o-mini model to intelligently clean and standardize customer data from your CSV file. It processes the first 50 rows and provides comprehensive data cleaning including postal code inference, phone number standardization, and address formatting.

## Features

✅ **Intelligent Postal Code Inference**: Uses street and city information to infer missing postal codes
✅ **Phone Number Standardization**: Converts all phone numbers to E.164 format with proper country codes
✅ **Address Standardization**: Cleans street names and standardizes common abbreviations
✅ **Name Standardization**: Properly formats names, handles titles and salutations
✅ **Email Validation**: Checks and cleans email addresses
✅ **Company Information Cleaning**: Standardizes company names and additional information
✅ **Country Code Standardization**: Ensures proper country codes (DE for Germany, etc.)

## Prerequisites

1. **OpenAI API Key**: You need an OpenAI API key
2. **Node.js**: Version 18+ (for built-in fetch support)
3. **Dependencies**: All required packages are already installed in the project

## Setup

### 1. Set OpenAI API Key

```bash
export OPENAI_API_KEY="your-openai-api-key-here"
```

### 2. Test the Setup

Run the test script to verify everything is working:

```bash
node test-openai-setup.js
```

This will:

- Check if your API key is set
- Verify the input file exists
- Test CSV structure
- Test phone number cleaning
- Test OpenAI API connection

## Usage

### Run the Data Cleaning Script

```bash
node openai-customer-cleaner.js
```

### What the Script Does

1. **Reads the first 50 rows** from `data/JTL-Export-Kundendaten-02052025.csv`
2. **Pre-cleans phone numbers** using the google-libphonenumber library
3. **Sends each customer record** to OpenAI for intelligent cleaning
4. **Processes the AI response** and applies the cleaned data
5. **Saves the results** to `data/kunden_openai_cleaned.csv`
6. **Generates a detailed report** in `data/openai_cleaning_report.txt`

### Output Files

- **`data/kunden_openai_cleaned.csv`**: Cleaned customer data
- **`data/openai_cleaning_report.txt`**: Detailed analysis report

## Cost Analysis

- **Model**: gpt-4o-mini (most cost-effective)
- **Estimated cost**: ~$0.075 for 50 rows
- **Cost per row**: ~$0.0015

## Example Transformations

### Before (Original Data)

```
Firma: "Gipser Geckle"
Strasse: "Langgewann 9"
PLZ: ""
Ort: "Bitigheim"
Tel: "724586998"
```

### After (Cleaned Data)

```
Firma: "Gipser Geckle"
Strasse: "Langgewann 9"
PLZ: "76467"
Ort: "Bitigheim"
Tel: "+49724586998"
```

## Error Handling

The script includes robust error handling:

- **API Failures**: Falls back to phone-only cleaning if OpenAI fails
- **Invalid Data**: Preserves original data when cleaning fails
- **Rate Limiting**: Handles OpenAI API rate limits gracefully
- **Network Issues**: Retries with fallback data

## Customization

### Change Number of Rows

Edit `MAX_ROWS` in `openai-customer-cleaner.js`:

```javascript
const MAX_ROWS = 100; // Process 100 rows instead of 50
```

### Change OpenAI Model

Edit `OPENAI_MODEL` in `openai-customer-cleaner.js`:

```javascript
const OPENAI_MODEL = 'gpt-4'; // Use GPT-4 instead of GPT-4o-mini
```

### Adjust Temperature

Edit the temperature setting for more/less creative responses:

```javascript
temperature: 0.1, // Lower = more consistent, Higher = more creative
```

## Troubleshooting

### Common Issues

1. **"OPENAI_API_KEY environment variable is required"**

   - Solution: Set your API key: `export OPENAI_API_KEY="your-key"`

2. **"Input file not found"**

   - Solution: Ensure `data/JTL-Export-Kundendaten-02052025.csv` exists

3. **"OpenAI API connection failed"**

   - Solution: Check your API key and internet connection

4. **"Rate limit exceeded"**
   - Solution: Wait a few minutes and try again

### Debug Mode

To see detailed API responses, add this to the script:

```javascript
console.log('OpenAI Response:', JSON.stringify(data, null, 2));
```

## Performance Tips

1. **Start Small**: Test with 10-20 rows first
2. **Monitor Costs**: Check your OpenAI usage dashboard
3. **Batch Processing**: For large datasets, process in batches
4. **Error Recovery**: The script continues even if some records fail

## Next Steps

After running the script:

1. **Review the cleaned data** in `kunden_openai_cleaned.csv`
2. **Verify postal code inferences** are accurate
3. **Check phone number formats** are correct
4. **Validate address standardizations**
5. **Consider processing remaining records** if results are satisfactory

## Support

If you encounter issues:

1. Run `node test-openai-setup.js` to diagnose problems
2. Check the analysis report for error details
3. Verify your OpenAI API key has sufficient credits
4. Ensure all dependencies are installed: `npm install`
