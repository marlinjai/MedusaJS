/**
 * import-suppliers.ts
 * Script to import suppliers from a CSV file
 */
import { ExecArgs } from "@medusajs/framework/types"
import fs from 'fs'
import path from 'path'
import { parse } from 'csv-parse/sync'
import SupplierService from "../modules/supplier/service"
export default async function importSuppliers({
  container,
  args,
}: ExecArgs) {
  if (!args || args.length < 1) {
    console.error("Please provide a path to the CSV file as an argument")
    process.exit(1)
  }

  const filePath = args[0]
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`)
    process.exit(1)
  }

  console.log(`Importing suppliers from ${filePath}...`)
  
  try {
    // Read and parse the CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8')
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    })
    
    if (!records.length) {
      console.log("No records found in the CSV file")
      return
    }
    
    console.log(`Found ${records.length} records`)
    
    // Get the supplier service
    const supplierService = container.resolve("supplier") as SupplierService
    
    // Import suppliers
    const suppliers = await supplierService.importFromCsv(records)
    
    console.log(`Successfully imported ${suppliers.length} suppliers`)
  } catch (error) {
    console.error(`Error importing suppliers: ${error.message}`)
    console.error(error.stack)
    process.exit(1)
  }
} 