import axios from 'axios';

export const getTrends = async (req, res) => {
  const { niche } = req.body;

  if (!niche) {
    return res.status(400).json({ message: 'Niche is required' });
  }

  try {
    const apiKey = process.env.GNEWS_API_KEY;
    const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(niche)}&lang=en&max=5&apikey=${apiKey}`;
    const response = await axios.get(url);
    const articles = response.data.articles || [];

    const trends = articles.map((article) => ({
      title: article.title,
      description: article.description || '',
      url: article.url,
      source: article.source.name,
    }));

    res.json({ trends });
  } catch (err) {
    console.error('GNews fetch error:', err.message);
    res.status(500).json({ message: 'Failed to fetch trends. Please try again later.' });
  }
};
