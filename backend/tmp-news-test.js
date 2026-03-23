const projectName = "Hebbal Flyover";
const query = `"${projectName}"`; 
const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;

console.log('Fetching:', url);

fetch(url)
  .then(res => {
    console.log('Status:', res.status);
    return res.text();
  })
  .then(xml => {
    console.log('XML length:', xml.length);
    const items = [];
    // Extract title, link, description ignoring CDATA safely
    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<description>([\s\S]*?)<\/description>/gi;
    
    let match;
    while ((match = itemRegex.exec(xml)) !== null && items.length < 6) {
        const title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        let desc = match[3].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
        desc = desc.replace(/<[^>]*>?/gm, ' '); // Strip HTML heavily to get plain text NLP base
        
        items.push({
            title: title,
            url: match[2],
            content: desc
        });
    }
    console.log('Extracted items:', items.length);
    if (items.length > 0) {
        console.log('First item:', items[0]);
    }
  })
  .catch(err => console.error(err));
