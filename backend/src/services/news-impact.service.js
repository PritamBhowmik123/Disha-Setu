/**
 * src/services/news-impact.service.js
 * Isolated Project News & Civic Insights Engine
 */
const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 mins

function extractInsights(articles) {
    const insights = [];
    const tags = new Set();
    let mainHighlight = null;

    const keywords = {
        progress: /completed|inaugurated|opens|launched|finished|ready|starts|begins|update|speed/i,
        delays: /delayed|stalled|postponed|halts|stops|protests|misses|snarls/i,
        benefits: /eases|reduces|saves|helps|boosts|improves/i,
        impact: /capacity|lanes|beds|crore|km|passengers|vehicles/i
    };

    articles.forEach(a => {
        const t = a.title;
        const lower = t.toLowerCase();

        if (!mainHighlight && (lower.match(keywords.progress) || lower.match(keywords.impact))) {
            mainHighlight = t;
            if (lower.match(keywords.progress)) tags.add('Progress');
            if (lower.match(keywords.impact)) tags.add('Impact');
        } else if (insights.length < 5) {
            if (lower.match(keywords.delays)) {
                insights.push(`Delay Warning: ${t}`);
                tags.add('Delayed');
            } else if (lower.match(keywords.benefits)) {
                insights.push(`Expected Benefit: ${t}`);
                tags.add('Benefit');
            } else if (lower.match(keywords.progress)) {
                insights.push(`Status Update: ${t}`);
                tags.add('Progress');
            } else if (lower.match(keywords.impact)) {
                insights.push(`Civic Impact: ${t}`);
                tags.add('Scale');
            }
        }
    });

    if (!mainHighlight && articles.length > 0) {
        mainHighlight = articles[0].title;
    }

    // Fill up to 4 if short
    for (let i = 0; insights.length < 4 && i < articles.length; i++) {
        if (articles[i].title !== mainHighlight && !insights.some(ins => ins.includes(articles[i].title))) {
            insights.push(articles[i].title);
        }
    }

    if (tags.size === 0 && articles.length > 0) tags.add('News');

    return {
        mainHighlight: mainHighlight || "No major news updates available recently.",
        insights,
        tags: Array.from(tags).slice(0, 3)
    };
}

exports.getProjectNews = async (projectName, area, category = '') => {
    const cleanName = projectName ? projectName.replace(/[^a-zA-Z0-9 ]/g, ' ').trim() : '';
    const cleanArea = area ? area.replace(/[^a-zA-Z0-9 ]/g, ' ').trim() : '';

    if (!cleanName) return { articles: [], insights: [], mainHighlight: null, tags: [] };

    const cacheKey = `${cleanName}-${cleanArea}-${category}`;
    if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        if (cleanName.toLowerCase().includes('bharat mandapam')) {
            // Live RSS fetch — Bharat Mandapam is an event venue, so events ARE its civic impact
            const queries = [
                'Bharat Mandapam Delhi 2025 OR 2026',
                'Bharat Mandapam ITPO Pragati Maidan Delhi'
            ];
            
            const allItems = [];
            const seenTitles = new Set();
            
            // Block other states borrowing the name AND purely political inauguration headlines
            const offTopicRegex = /\b(rajasthan|jaipur|pune|lohegaon|nagpur|bhopal|lucknow|gujarat|mumbai|chennai|kolkata|pm modi|pm|modi inaugurates|inaugurated bharat|will open|will inaugurate)\b/i;

            for (const q of queries) {
                try {
                    const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-IN&gl=IN&ceid=IN:en`;
                    const response = await fetch(url);
                    const xml = await response.text();
                    const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/gi;
                    let match;
                    while ((match = itemRegex.exec(xml)) !== null) {
                        let title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').replace(/ - .*$/, '').trim();
                        const tLow = title.toLowerCase();

                        if (seenTitles.has(title)) continue;
                        if (offTopicRegex.test(tLow)) continue;

                        const hasTarget = tLow.includes("bharat mandapam") || tLow.includes("iecc") || tLow.includes("pragati maidan");
                        if (hasTarget) {
                            seenTitles.add(title);
                            allItems.push({ title, link: match[2], source: match[3], published_date: match[4] });
                        }
                    }
                } catch (_) {}
            }

            allItems.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
            const top = allItems.slice(0, 8);
            const finalData = {
                articles: top,
                ...extractInsights(top),
                purpose: "Global convention center built for G20, summits, trade fairs, and international events",
                mainHighlight: "India's largest IECC at Pragati Maidan, inaugurated July 2023"
            };
            if (!finalData.insights) finalData.insights = [];
            finalData.insights.unshift("Core Purpose: Hosts G20, international summits, trade fairs, and cultural events");
            finalData.insights.unshift("Built in 2017–2023 as part of Pragati Maidan integrated redevelopment project");

            cache.set(cacheKey, { timestamp: Date.now(), data: finalData });
            return finalData;
        }

        const noiseRegex = /\b(crime|crimes|criminal|murder|murders|killed|killing|death|dead|rape|suicide|covid|coronavirus|pandemic|celebrity|bollywood|hollywood|movie|movies|actor|actress|cricket|ipl|match|tournament)\b/i;
        const infraRegex = /\b(project|projects|construction|metro|road|roads|highway|highways|flyover|bridge|bridges|pipeline|infrastructure|development|facility|corridor)\b/i;

        const areaAliases = [];
        const lowerArea = cleanArea.toLowerCase();
        if (lowerArea.includes('bangalore') || lowerArea.includes('bengaluru')) {
            areaAliases.push('bangalore', 'bengaluru', 'karnataka');
        } else if (lowerArea.includes('mumbai') || lowerArea.includes('bombay')) {
            areaAliases.push('mumbai', 'bombay', 'maharashtra', 'navi mumbai');
        } else if (lowerArea.includes('kolkata') || lowerArea.includes('calcutta')) {
            areaAliases.push('kolkata', 'calcutta', 'west bengal');
        } else if (lowerArea.includes('delhi')) {
            areaAliases.push('delhi', 'new delhi', 'ncr');
        } else if (lowerArea.includes('chennai') || lowerArea.includes('madras')) {
            areaAliases.push('chennai', 'madras', 'tamil nadu');
        } else if (lowerArea.includes('hyderabad')) {
            areaAliases.push('hyderabad', 'telangana');
        } else if (lowerArea.includes('pune')) {
            areaAliases.push('pune', 'pcmc', 'maharashtra');
        } else if (lowerArea.includes('ahmedabad')) {
            areaAliases.push('ahmedabad', 'gujarat');
        } else if (lowerArea) {
            areaAliases.push(lowerArea.replace(/(city|district)/g, '').trim());
        }

        let catTokens = "";
        const catLower = category ? category.toLowerCase() : "";
        if (catLower.includes('metro')) catTokens = "metro rail line station";
        else if (catLower.includes('road')) catTokens = "road highway flyover";
        else if (catLower.includes('hospital')) catTokens = "hospital expansion government";
        else if (catLower.includes('water')) catTokens = "water pipeline drainage";
        else if (catLower.includes('housing')) catTokens = "housing redevelopment";
        else if (catLower.includes('bridge')) catTokens = "flyover bridge";

        const catStr = catTokens ? ` ${catTokens}` : '';

        const stopWords = new Set(['of', 'the', 'in', 'and', 'project', 'phase', 'new', 'for', 'to', 'a', 'an', 'on', 'with', 'at', 'modernization', 'development', 'infrastructure', 'improvement', 'update', 'status']);
        const nameKeywordsRaw = cleanName.toLowerCase().split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));
        const nameKeywords = nameKeywordsRaw.filter(w => !areaAliases.includes(w) && !lowerArea.includes(w));
        
        const categoryKeywords = catStr.trim().toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const strictRelevanceKeywords = [...new Set([...nameKeywords, ...categoryKeywords])];

        const isRelevant = (title) => {
            const t = title.toLowerCase();
            if (noiseRegex.test(t)) return false;
            
            const hasArea = areaAliases.length > 0 ? areaAliases.some(alias => t.includes(alias)) : true;
            if (!hasArea) return false;
            
            if (!infraRegex.test(t)) return false;

            if (strictRelevanceKeywords.length > 0) {
                const hasSpecificContext = strictRelevanceKeywords.some(kw => t.includes(kw));
                if (!hasSpecificContext) return false;
            }

            return true;
        };

        const fetchArticles = async (queryStr) => {
            const url = `https://news.google.com/rss/search?q=${encodeURIComponent(queryStr)}&hl=en-IN&gl=IN&ceid=IN:en`;
            const response = await fetch(url);
            const xml = await response.text();

            const items = [];
            const seenTitles = new Set();
            const itemRegex = /<item>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<link>(.*?)<\/link>[\s\S]*?<source[^>]*>(.*?)<\/source>[\s\S]*?<pubDate>(.*?)<\/pubDate>[\s\S]*?<\/item>/gi;

            let match;
            while ((match = itemRegex.exec(xml)) !== null) {
                let title = match[1].replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1');
                title = title.replace(/ - .*$/, '').trim(); 

                if (seenTitles.has(title)) continue;
                seenTitles.add(title);

                if (isRelevant(title)) {
                    items.push({
                        title,
                        link: match[2],
                        source: match[3],
                        published_date: match[4]
                    });
                }
            }
            return items;
        };

        const mainQuery = `${cleanName} ${cleanArea}${catStr} infrastructure project development India`.trim();
        let items = await fetchArticles(mainQuery);

        // Fallback logic if few articles found
        if (items.length < 3 && cleanArea) {
            const fallbackQuery = `${cleanArea} infrastructure development India`.trim();
            const fallbackItems = await fetchArticles(fallbackQuery);
            const existingLinks = new Set(items.map(i => i.link));
            for (const item of fallbackItems) {
                if (!existingLinks.has(item.link)) {
                    items.push(item);
                }
            }
        }

        // Sort by Date DESC
        items.sort((a, b) => new Date(b.published_date).getTime() - new Date(a.published_date).getTime());
        
        // Limit to top 6-8 articles
        items = items.slice(0, 8);

        const finalData = {
            articles: items,
            ...extractInsights(items)
        };

        // Save to lightweight 10 min cache
        cache.set(cacheKey, { timestamp: Date.now(), data: finalData });

        return finalData;
    } catch (err) {
        console.error('[NewsImpact] Failed to fetch news:', err);
        return { articles: [], insights: [], mainHighlight: null, tags: [] };
    }
};
