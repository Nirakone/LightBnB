const properties = require("./json/properties.json");
const users = require("./json/users.json");

//connect to db

const { Pool } = require('pg');
const pool = new Pool({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
// const getUserWithEmail = function (email) {
//   let resolvedUser = null;
//   for (const userId in users) {
//     const user = users[userId];
//     if (user?.email.toLowerCase() === email?.toLowerCase()) {
//       resolvedUser = user;
//     }
//   }
//   return Promise.resolve(resolvedUser);
// };

const getUserWithEmail = function(email) {
  const query = `SELECT * FROM users WHERE email = $1;`;
  return pool.query(query, [email]).then((result) => result.rows[0]).catch((err) => err.message);
};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
// const getUserWithId = function (id) {
//   return Promise.resolve(users[id]);
// };

const getUserWithId = function(id) {
  const query = `SELECT * FROM users WHERE id = $1;`;
  return pool.query(query, [id]).then((result) => result.rows[0]).catch((err) => err.message);
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
// const addUser = function (user) {
//   const userId = Object.keys(users).length + 1;
//   user.id = userId;
//   users[userId] = user;
//   return Promise.resolve(user);
// };

const addUser = function (user) {
  const { name, email, password } = user;
  const query = `INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *;
  `;

  return pool.query(query, [name, email, password]).then((result) => result.rows[0]).catch((err) => err.message);
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
// const getAllReservations = function (guest_id, limit = 10) {
//   return getAllProperties(null, 2);
// };

const getAllReservations = function (guest_id, limit = 10) {
  const query = `
  SELECT properties.* , reservations.* , AVG(property_reviews.rating) AS average_rating
  FROM properties
    JOIN reservations ON properties.id = reservations.property_id
    JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1 AND reservations.end_date < now()::date
  GROUP BY reservations.id, properties.id
  ORDER BY reservations.start_date
  LIMIT $2;
  `;

  return pool.query(query, [guest_id, limit]).then((result) => result.rows).catch((err) => err.message);
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
// const getAllProperties = function (options, limit = 10) {
//   const limitedProperties = {};
//   for (let i = 1; i <= limit; i++) {
//     limitedProperties[i] = properties[i];
//   }
//   return Promise.resolve(limitedProperties);
// };
//v2
// const getAllProperties = (options, limit = 10) => {
//   return pool
//     .query(`SELECT * FROM properties LIMIT $1`, [limit])
//     .then((result) => {
//       console.log(result.rows);
//       return result.rows;
//     })
//     .catch((err) => {
//       console.log(err.message);
//     });
// };
//final
const getAllProperties = function (options, limit = 10) {
  const queryParams = [];
  const conditions = [];
  const { city, owner_id, minimum_price_per_night, maximum_price_per_night, minimum_rating } = options;

  // start query
  let query = `
  SELECT properties.* , AVG(property_reviews.rating) AS average_rating
  FROM properties JOIN property_reviews ON properties.id = property_reviews.property_id `;

  // filtering by city
  if (city) {
    queryParams.push(`%${city}%`);
    conditions.push(`city LIKE $${queryParams.length}`);
  }

  // filtering by owner_id
  if (owner_id) {
    queryParams.push(owner_id);
    conditions.push(`properties.owner_id = $${queryParams.length}`);
  }

  // filtering by min price
  if (minimum_price_per_night) {
    queryParams.push(100 * minimum_price_per_night);
    conditions.push(`cost_per_night >= $${queryParams.length}`);
  }

  // ... by max price
  if (maximum_price_per_night) {
    queryParams.push(100 * maximum_price_per_night);
    conditions.push(`cost_per_night <= $${queryParams.length}`);
  }

  // join the WHERE
  if (conditions.length) {
    query += `WHERE ` + conditions.join(" AND ");
  }

  // group  property id
  query += `GROUP BY properties.id `;

  // filter by average rating
  if (minimum_rating) {
    queryParams.push(minimum_rating);
    query += `HAVING AVG(property_reviews.rating) >= $${queryParams.length} `;
  }

  // sort by the cost and limit the number of results
  queryParams.push(limit);
  query += `
  ORDER BY cost_per_night 
  LIMIT $${queryParams.length};`;

  return pool.query(query, queryParams)
    .then((result) => {
      return result.rows;
    })
    .catch((err) => err.message);
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
// const addProperty = function (property) {
//   const propertyId = Object.keys(properties).length + 1;
//   property.id = propertyId;
//   properties[propertyId] = property;
//   return Promise.resolve(property);
// };
const addProperty = function (property) {
  console.log(property);
  const keys = [
    "owner_id",
    "title",
    "description",
    "thumbnail_photo_url",
    "cover_photo_url",
    "cost_per_night",
    "parking_spaces",
    "number_of_bathrooms",
    "number_of_bedrooms",
    "country",
    "street",
    "city",
    "province",
    "post_code",
  ];

  const values = keys.map((column) => property[column] ? property[column] : null);
  const injectionId = keys.map((column, i) => `$${i + 1}`);

  const query = `
  INSERT INTO properties
  (
  owner_id, title, description, thumbnail_photo_url, cover_photo_url,
  cost_per_night, parking_spaces, number_of_bathrooms, number_of_bedrooms,
  country, street, city, province, post_code
  )
VALUES
  (${injectionId.join()})
  RETURNING *;
  `
  return pool.query(query, values).then((result) => result.rows).catch((err) => err.message);

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
