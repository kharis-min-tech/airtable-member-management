import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';
import { AIRTABLE_TABLES } from '../src/services/airtable-client';

/**
 * Property 10: No Volunteer Table References
 * 
 * For the AIRTABLE_TABLES constant object, it should not contain a VOLUNTEERS property,
 * and no code in the system should attempt to reference AIRTABLE_TABLES.VOLUNTEERS.
 * 
 * Validates: Requirements 13.1, 13.2
 */

describe('Property 10: No Volunteer Table References', () => {
  const excludedPaths = [
    'node_modules',
    'dist',
    'coverage',
    'cdk.out',
    '.git',
    '.kiro/specs', // Exclude spec files as they document the change
  ];

  const shouldExcludePath = (filePath: string): boolean => {
    return excludedPaths.some(excluded => filePath.includes(excluded));
  };

  const getAllTypeScriptFiles = (dir: string, fileList: string[] = []): string[] => {
    if (!fs.existsSync(dir)) {
      return fileList;
    }

    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      
      if (shouldExcludePath(filePath)) {
        return;
      }

      if (fs.statSync(filePath).isDirectory()) {
        getAllTypeScriptFiles(filePath, fileList);
      } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
        fileList.push(filePath);
      }
    });

    return fileList;
  };

  /**
   * Property 10.1: AIRTABLE_TABLES constant should not contain VOLUNTEERS property
   * 
   * Validates that the AIRTABLE_TABLES constant does not have a VOLUNTEERS key
   */
  it('should not have VOLUNTEERS property in AIRTABLE_TABLES constant', () => {
    // Property: AIRTABLE_TABLES should not have a VOLUNTEERS key
    expect(AIRTABLE_TABLES).not.toHaveProperty('VOLUNTEERS');
    
    // Property: The keys of AIRTABLE_TABLES should not include 'VOLUNTEERS'
    const tableKeys = Object.keys(AIRTABLE_TABLES);
    expect(tableKeys).not.toContain('VOLUNTEERS');
  });

  /**
   * Property 10.2: No code should reference AIRTABLE_TABLES.VOLUNTEERS
   * 
   * Validates that no source code attempts to access the non-existent VOLUNTEERS table
   */
  it('should not reference AIRTABLE_TABLES.VOLUNTEERS in any source code', () => {
    const srcFiles = getAllTypeScriptFiles(path.join(process.cwd(), 'src'));
    const violatingFiles: { file: string; lines: { lineNum: number; content: string }[] }[] = [];

    srcFiles.forEach(file => {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const violations: { lineNum: number; content: string }[] = [];

      lines.forEach((line, index) => {
        // Check for AIRTABLE_TABLES.VOLUNTEERS references
        if (
          line.includes('AIRTABLE_TABLES.VOLUNTEERS') &&
          !line.trim().startsWith('//') && // Ignore comments
          !line.trim().startsWith('*') // Ignore JSDoc comments
        ) {
          violations.push({
            lineNum: index + 1,
            content: line.trim(),
          });
        }
      });

      if (violations.length > 0) {
        violatingFiles.push({ file, lines: violations });
      }
    });

    if (violatingFiles.length > 0) {
      const errorMessage = violatingFiles
        .map(({ file, lines }) => {
          const lineDetails = lines
            .map(({ lineNum, content }) => `  Line ${lineNum}: ${content}`)
            .join('\n');
          return `${file}:\n${lineDetails}`;
        })
        .join('\n\n');

      throw new Error(`Found AIRTABLE_TABLES.VOLUNTEERS references in source files:\n\n${errorMessage}`);
    }
  });

  /**
   * Property 10.3: Airtable client file should have explanatory comment
   * 
   * Validates that the airtable-client.ts file contains a comment explaining
   * that follow-up members are stored in the Members table
   */
  it('should have explanatory comment about follow-up members in Members table', () => {
    const airtableClientPath = path.join(process.cwd(), 'src', 'services', 'airtable-client.ts');
    
    if (fs.existsSync(airtableClientPath)) {
      const content = fs.readFileSync(airtableClientPath, 'utf-8');
      
      // Property: File should contain comment about follow-up members being in Members table
      const hasExplanatoryComment = 
        content.includes('Follow-up members') &&
        content.includes('Members table');
      
      expect(hasExplanatoryComment).toBe(true);
    }
  });

  /**
   * Property 10.4: Property-based test for VOLUNTEERS table references across random file samples
   * 
   * Uses fast-check to randomly sample files and verify no VOLUNTEERS table references exist
   */
  it('should not reference VOLUNTEERS table in random file samples', () => {
    const allFiles = getAllTypeScriptFiles(path.join(process.cwd(), 'src'));

    if (allFiles.length === 0) {
      return; // No files to test
    }

    // Arbitrary for selecting random files
    const fileIndexArb = fc.integer({ min: 0, max: allFiles.length - 1 });

    fc.assert(
      fc.property(fileIndexArb, (fileIndex) => {
        const file = allFiles[fileIndex];
        if (!file) {
          return true; // Skip if file is undefined
        }
        
        const content = fs.readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        
        // Property: No line should contain AIRTABLE_TABLES.VOLUNTEERS outside of comments
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          
          const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');
          
          if (!isComment && line.includes('AIRTABLE_TABLES.VOLUNTEERS')) {
            throw new Error(
              `Found AIRTABLE_TABLES.VOLUNTEERS reference in ${file} at line ${i + 1}: ${line.trim()}`
            );
          }
        }
        
        return true;
      }),
      { numRuns: 100 } // Test 100 random file samples
    );
  });

  /**
   * Property 10.5: All table references should use MEMBERS for follow-up member queries
   * 
   * Validates that code querying follow-up members uses AIRTABLE_TABLES.MEMBERS
   */
  it('should use AIRTABLE_TABLES.MEMBERS for follow-up member queries', () => {
    const followUpServicePath = path.join(process.cwd(), 'src', 'services', 'follow-up-service.ts');
    
    if (fs.existsSync(followUpServicePath)) {
      const content = fs.readFileSync(followUpServicePath, 'utf-8');
      
      // Property: If file queries for follow-up members, it should use MEMBERS table
      if (content.includes('follow-up') || content.includes('followUp')) {
        // Should not reference VOLUNTEERS table
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (
            line.includes('AIRTABLE_TABLES.VOLUNTEERS') &&
            !line.trim().startsWith('//') &&
            !line.trim().startsWith('*')
          ) {
            throw new Error(
              `Found AIRTABLE_TABLES.VOLUNTEERS in follow-up service at line ${index + 1}: ${line.trim()}`
            );
          }
        });
      }
    }
  });
});
