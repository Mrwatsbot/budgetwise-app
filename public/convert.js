const fs = require('fs');
const { exec } = require('child_process');

// Try using ImageMagick convert
exec('convert -background none -density 300 "minimal-olive-branch-icon-for-a-fintech-app-logo--.svg" -resize 400x400 option-a.png', (err) => {
    if (err) console.error('Error converting A:', err.message);
    else console.log('Converted A');
});

exec('convert -background none -density 300 "minimal-olive-branch-icon-for-a-fintech-app-logo-- (1).svg" -resize 400x400 option-b.png', (err) => {
    if (err) console.error('Error converting B:', err.message);
    else console.log('Converted B');
});
