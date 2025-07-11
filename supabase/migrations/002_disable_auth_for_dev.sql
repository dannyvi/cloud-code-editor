-- Temporary migration to disable authentication for development
-- This allows the app to work without user authentication during development

-- Drop existing policies
DROP POLICY IF EXISTS "Public projects are viewable by everyone" ON projects;
DROP POLICY IF EXISTS "Users can view own projects" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can update own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete own projects" ON projects;

DROP POLICY IF EXISTS "Public project files are viewable by everyone" ON project_files;
DROP POLICY IF EXISTS "Users can view own project files" ON project_files;
DROP POLICY IF EXISTS "Users can create own project files" ON project_files;
DROP POLICY IF EXISTS "Users can update own project files" ON project_files;
DROP POLICY IF EXISTS "Users can delete own project files" ON project_files;

-- Create permissive policies for development (allow all operations)
CREATE POLICY "Allow all operations on projects for development" 
    ON projects FOR ALL 
    USING (true) 
    WITH CHECK (true);

CREATE POLICY "Allow all operations on project_files for development" 
    ON project_files FOR ALL 
    USING (true) 
    WITH CHECK (true);

-- Make owner_id nullable for development
ALTER TABLE projects ALTER COLUMN owner_id DROP NOT NULL;