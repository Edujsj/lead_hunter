const fs = require('fs');
const html = fs.readFileSync('google_images.html', 'utf8');
const m = html.match(/src="(https:\/\/encrypted-tbn0\.gstatic\.com\/images[^"]+)"/g);
if (m) {
  console.log(`Encontradas ${m.length} imagens!`);
  const urls = m.map(s => s.replace('src="', '').replace('"', ''));
  console.log(urls.slice(0, 5));
} else {
  console.log("0 imagens");
}
