import { createClient } from '@supabase/supabase-js'

const url = 'https://rhsebbknhcdegnmyrqaf.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJoc2ViYmtuaGNkZWdubXlycWFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTc1OTUsImV4cCI6MjA5MTk5MzU5NX0.0E9L2WdX2eDx2sYOAxqVTfD9DAmUqYyj9Yiccy9UfuQ'

export const supabase = createClient(url, key)
