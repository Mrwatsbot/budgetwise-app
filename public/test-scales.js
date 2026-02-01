const sharp = require('sharp');

async function testScales() {
    // Create small versions to test favicon rendering
    await sharp('option-a.png').resize(32, 32).toFile('option-a-32px.png');
    await sharp('option-a.png').resize(16, 16).toFile('option-a-16px.png');
    
    await sharp('option-b.png').resize(32, 32).toFile('option-b-32px.png');
    await sharp('option-b.png').resize(16, 16).toFile('option-b-16px.png');
    
    // Also create versions with the brand orange background
    const orange = { r: 232, g: 146, b: 46, alpha: 1 };
    
    await sharp('option-a.png')
        .resize(400, 400, { fit: 'contain', background: orange })
        .toFile('option-a-orange.png');
    
    await sharp('option-b.png')
        .resize(400, 400, { fit: 'contain', background: orange })
        .toFile('option-b-orange.png');
    
    console.log('Created all test sizes');
}

testScales();
