// app.js
const express = require('express');
const axios = require('axios');
const OAuth = require('oauth-1.0a');
const crypto = require('crypto');

const app = express();
app.set('view engine', 'ejs');

const consumerKey = '82xwD377tKqEjGm8fCDj';
const consumerSecret = 'DvtbWdfBdryLkCLCcQrPdLC9zbDPGgmfpz5u6Wch';

const oauth = OAuth({
  consumer: { key: consumerKey, secret: consumerSecret },
  signature_method: 'HMAC-SHA1',
  hash_function(base_string, key) {
    return crypto.createHmac('sha1', key).update(base_string).digest('base64');
  }
});

app.get('/', (req, res) => {
  res.send('Welcome to the USOS API Staff Index');
});

app.get('/staff', async (req, res) => {
  console.log('Request received:', req.query.query);

  const searchApiUrl = 'https://usosapps.impan.pl/services/users/search2';
  const searchParams = {
    lang: 'en',
    fields: 'items|next_page',
    query: req.query.query || '',
    among: 'current_staff',
    num: 20,
    start: 0,
    format: 'json'
  };

  const authHeader = oauth.toHeader(oauth.authorize({
    url: searchApiUrl,
    method: 'GET',
    data: searchParams
  }));

  try {
    const searchResponse = await axios.get(searchApiUrl, {
      params: searchParams,
      headers: {
        ...authHeader,
        'Content-Type': 'application/json'
      }
    });
    
    const searchResults = searchResponse.data;
    console.log('Search results:', searchResults);

    const staffData = [];

    if (searchResults.items) {
      for (const staffMember of searchResults.items) {
        const userId = staffMember.user.id;
        const userApiUrl = 'https://usosapps.impan.pl/services/users/user';
        const userParams = {
          user_id: userId,
          fields: 'email|phone_numbers|mobile_numbers',
          format: 'json'
        };

        const userAuthHeader = oauth.toHeader(oauth.authorize({
          url: userApiUrl,
          method: 'GET',
          data: userParams
        }));

        const userResponse = await axios.get(userApiUrl, {
          params: userParams,
          headers: {
            ...userAuthHeader,
            'Content-Type': 'application/json'
          }
        });

        const userDetails = userResponse.data;
        staffMember.email = userDetails.email || '';
        staffMember.phone_numbers = userDetails.phone_numbers || [];
        staffMember.mobile_numbers = userDetails.mobile_numbers || [];
        staffData.push(staffMember);
      }
    }

    console.log('Staff data:', staffData);

    res.render('staff_table', { staff_data: staffData });
  } catch (error) {
    console.error('Error fetching staff data:', error);
    res.status(500).send('Internal Server Error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
