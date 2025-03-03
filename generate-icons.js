const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

function generatePacmanIcon(size) {
    canvas.width = size;
    canvas.height = size;
    
    // Background
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, size, size);
    
    // Pacman
    ctx.fillStyle = 'yellow';
    ctx.beginPath();
    ctx.arc(size/2, size/2, size*0.4, 0.2, Math.PI * 2 - 0.2);
    ctx.lineTo(size/2, size/2);
    ctx.fill();
    
    // Convert to blob and download
    canvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `icon-${size}.png`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

// Generate both sizes
generatePacmanIcon(192);
generatePacmanIcon(512); 