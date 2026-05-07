import { createClient } from '@supabase/supabase-js'

const url = 'https://jerxnzctjudsfzwukzvm.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImplcnhuemN0anVkc2Z6d3VrenZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzOTY3NDcsImV4cCI6MjA5MTk3Mjc0N30.wtK7gGhCPldoLsl8ZjG6JQvaV5K7nS7YmTp3ow1olkQ'

export const supabaseLapor = createClient(url, key)
