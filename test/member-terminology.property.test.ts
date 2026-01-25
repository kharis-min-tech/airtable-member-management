import * as fc from 'fast-check';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Property 3: Member terminology consistency
 * 
 * For any system interface, API response, or data operation, all references 
 * should use "Member" terminology instead of "Volunteer" terminology and 
 * treat all participants as Member_Record entities
 * 
 * Validates: Requirements 2.1, 2.2, 2.3
 */

describe('Member Terminology Consistency', () => {
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
   * Property 3.1: Type definitions should not contain Volunteer terminology
   * 
   * Validates that type definition files use Member terminology consistently
   */
  it('should not have Volunteer types or interfaces in type definitions', () => {
    const typeFiles = [
      path.join(process.cwd(), 'src', 'types', 'index.ts'),
      path.join(process.cwd(), 'frontend', 'src', 'types', 'index.ts'),
    ];

    typeFiles.forEach(typeFile => {
      if (fs.existsSync(typeFile)) {
        const content = fs.readFileSync(typeFile, 'utf-8');
        
        // Check for Volunteer interface or type definitions
        expect(content).not.toMatch(/interface\s+Volunteer\s*{/);
        expect(content).not.toMatch(/type\s+VolunteerRole\s*=/);
        expect(content).not.toMatch(/export\s+.*\s+Volunteer(?!Id)/); // Allow followUpMemberId
        
        // Check for volunteer-related field names (excluding followUpMemberId which is the new name)
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (line.includes('volunteer') && !line.includes('followUpMemberId') && !line.includes('//')) {
            fail(`Found volunteer reference at line ${index + 1} in ${typeFile}: ${line.trim()}`);
          }
        });
      }
    });
  });

  /**
   * Property 3.2: Source code should use Member terminology consistently
   * 
   * Validates that all TypeScript source files use Member terminology
   */
  it('should use Member terminology in all source files', () => {
    const srcFiles = getAllTypeScriptFiles(path.join(process.cwd(), 'src'));
    const frontendSrcFiles = getAllTypeScriptFiles(path.join(process.cwd(), 'frontend', 'src'));
    const allFiles = [...srcFiles, ...frontendSrcFiles];

    const violatingFiles: { file: string; lines: { lineNum: number; content: string }[] }[] = [];

    allFiles.forEach(file => {
      // Skip test files for this check
      if (file.includes('.test.') || file.includes('.spec.')) {
        return;
      }

      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      const violations: { lineNum: number; content: string }[] = [];

      lines.forEach((line, index) => {
        // Check for Volunteer references (case-insensitive, excluding followUpMemberId)
        if (
          /volunteer/i.test(line) &&
          !line.includes('followUpMemberId') && // Allow followUpMemberId as the new name
          !line.includes('//') && // Ignore comments
          !line.includes('*') // Ignore JSDoc comments
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

      throw new Error(`Found Volunteer terminology in source files:\n\n${errorMessage}`);
    }
  });

  /**
   * Property 3.3: Mock data should use Member terminology
   * 
   * Validates that mock data files use Member terminology consistently
   */
  it('should use Member terminology in mock data', () => {
    const mockDataFile = path.join(process.cwd(), 'frontend', 'src', 'data', 'mockData.ts');

    if (fs.existsSync(mockDataFile)) {
      const content = fs.readFileSync(mockDataFile, 'utf-8');
      
      // Check for Volunteer-related variable names and types
      expect(content).not.toMatch(/SoulsAssignedByVolunteer/);
      expect(content).not.toMatch(/volunteerId/);
      expect(content).not.toMatch(/volunteerName/);
      
      // Should use Member terminology instead
      expect(content).toMatch(/Member|member/);
    }
  });

  /**
   * Property 3.4: API interfaces should use Member terminology
   * 
   * Validates that API service files use Member terminology consistently
   */
  it('should use Member terminology in API services', () => {
    const apiFiles = [
      path.join(process.cwd(), 'frontend', 'src', 'services', 'church-api.ts'),
      path.join(process.cwd(), 'frontend', 'src', 'services', 'api-client.ts'),
    ];

    apiFiles.forEach(apiFile => {
      if (fs.existsSync(apiFile)) {
        const content = fs.readFileSync(apiFile, 'utf-8');
        
        // Check for volunteer-related API endpoints or parameters
        const lines = content.split('\n');
        lines.forEach((line, index) => {
          if (
            /volunteer/i.test(line) &&
            !line.includes('followUpMemberId') && // Allow followUpMemberId as the new name
            !line.includes('//') && // Ignore comments
            !line.includes('*') // Ignore JSDoc comments
          ) {
            throw new Error(`Found volunteer reference at line ${index + 1} in ${apiFile}: ${line.trim()}`);
          }
        });
      }
    });
  });

  /**
   * Property 3.5: Property-based test for terminology consistency across random file samples
   * 
   * Uses fast-check to randomly sample files and verify terminology consistency
   */
  it('should maintain Member terminology consistency across random file samples', () => {
    const allFiles = [
      ...getAllTypeScriptFiles(path.join(process.cwd(), 'src')),
      ...getAllTypeScriptFiles(path.join(process.cwd(), 'frontend', 'src')),
    ].filter(file => !file.includes('.test.') && !file.includes('.spec.'));

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
        
        // Property: If file contains "volunteer" (case-insensitive), 
        // it should only be in comments or as "volunteerId" for backward compatibility
        const lines = content.split('\n');
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          
          if (/volunteer/i.test(line)) {
            // Should be either a comment, followUpMemberId, or not present
            const isComment = line.trim().startsWith('//') || line.trim().startsWith('*');
            const isFollowUpMemberId = line.includes('followUpMemberId');
            
            if (!isComment && !isFollowUpMemberId) {
              throw new Error(
                `Volunteer terminology found in ${file} at line ${i + 1}: ${line.trim()}`
              );
            }
          }
        }
        
        return true;
      }),
      { numRuns: 50 } // Test 50 random file samples
    );
  });
});
