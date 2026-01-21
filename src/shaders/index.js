const allowGLSLImports = (shdr, fragmentShader) => {
    // Match both $ filename $ and $import filename $
    const importRegex = /\$\s*(?:import\s+)?([\w\.\/\-]+)\s*\$/g;
    let result = fragmentShader;
    const matches = [];
    let match;
    
    // Collect all matches first
    while ((match = importRegex.exec(fragmentShader)) !== null) {
        matches.push({
            fullMatch: match[0],
            filename: match[1].trim()
        });
    }
    
    // Replace each match
    matches.forEach(({ fullMatch, filename }) => {
        try {
            const importedFileContent = shdr[filename.replace(".glsl", "")];
            result = result.replace(fullMatch, importedFileContent);
        } catch {
            console.error(`Failed to load file ${filename}`);
        }
    });
    
    return result;
}

export default allowGLSLImports;