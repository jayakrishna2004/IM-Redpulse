const bcrypt = require('bcrypt');
const h = bcrypt.hashSync('demo123', 10);
console.log('Hash:', h);
console.log('Matches demo123:', bcrypt.compareSync('demo123', h));
