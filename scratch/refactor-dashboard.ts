import * as fs from "fs";
import * as path from "path";

function walkDir(dir: string, callback: (filePath: string) => void) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
  });
}

const dashboardDir = path.join(process.cwd(), "src/app/dashboard");

walkDir(dashboardDir, (filePath) => {
  if (filePath.endsWith(".tsx") && !filePath.endsWith("layout.tsx")) {
    let content = fs.readFileSync(filePath, "utf-8");
    let initialContent = content;

    // 1. Remove Navbar import
    content = content.replace(/import\s*\{\s*Navbar\s*\}\s*from\s*["']@\/components\/Navbar["'];\n?/g, "");

    // 2. Remove <Navbar user={session} /> or similar
    content = content.replace(/<Navbar\s+user=\{.*?\}\s*\/>\n?/g, "");

    // 3. Adjust outer wrappers to remove min-h-screen and redundant bg colors
    // We'll replace <div className="min-h-screen bg-slate-100"> with <div className="w-full">
    content = content.replace(/className="min-h-screen[^"]*"/g, 'className="w-full"');
    
    // Also remove the explicit <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6"> 
    // Wait, the main tags are okay, but our layout already has the max-w-7xl and padding.
    // So if the page has a main with padding, it might have double padding. 
    // For now, let's just do the Navbar and let the user see if there's double padding. We can manually fix double padding if it occurs.

    if (content !== initialContent) {
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`Refactored: ${filePath}`);
    }
  }
});
