const sharp = require('sharp');
const fs = require('fs');

async function convert() {
    try {
        await sharp('minimal-olive-branch-icon-for-a-fintech-app-logo--.svg')
            .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile('option-a.png');
        console.log('Converted Option A');

        await sharp('minimal-olive-branch-icon-for-a-fintech-app-logo-- (1).svg')
            .resize(400, 400, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
            .png()
            .toFile('option-b.png');
        console.log('Converted Option B');
    } catch (err) {
        console.error('Error:', err.message);
    }
}

convert();
