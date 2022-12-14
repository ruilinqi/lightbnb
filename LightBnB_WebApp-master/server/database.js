const properties = require('./json/properties.json');
const users = require('./json/users.json');

// Connect to postgreSQL
const { Pool } = require('pg');

const pool = new Pool({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
});
// the following assumes that you named your connection variable `pool`
// pool
// .query(`SELECT title FROM properties LIMIT 10;`).then(response => {console.log(response)
// })
// .catch((err) => {
//   console.log("err", err.message);
// });


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = (email) => {
  return pool
    .query(`
    SELECT * 
    FROM users
    WHERE email LIKE $1;
    `, [`%${email}%`])
    .then((result) => {
      console.log("result of getUserWithEmail:", result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log("error:", err.message);
    });
    
};
exports.getUserWithEmail = getUserWithEmail;
  /*
    let user;
    for (const userId in users) {
      user = users[userId];
      if (user.email.toLowerCase() === email.toLowerCase()) {
        break;
      } else {
        user = null;
      }
    }
    return Promise.resolve(user);
   */ 

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = (id) => {
  return pool
    .query(`
    SELECT * 
    FROM users
    WHERE id LIKE $1;
    `, [`%${id}%`])
    .then((result) => {
      console.log("result of getUserWithId:", result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log("Error of getUserWithId:", err.message);
    });
    
  //return Promise.resolve(users[id]);
};
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = (user) => {
  
  return pool
    .query(`
    INSERT INTO users (name, email, password)
    VALUES ($1, $2, $3)
    RETURNING *;`, [`${user.name}`, `${user.email}`, `${user.password}`])
    .then((result) => {
      console.log("result of addUser:", result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log("Error of addUser", err.message);
    })
    
  /*
  const userId = Object.keys(users).length + 1;
  user.id = userId;
  users[userId] = user;
  return Promise.resolve(user);
  */
};
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  return pool
    .query(`
    SELECT * FROM reservations
    JOIN users ON users.id = guest_id
    JOIN properties ON properties.id = property_id
    WHERE guest_id = $1
    LIMIT $2`, [`${guest_id}`, `${limit}`])
    .then((result) => {
      console.log("getAllReservations", result.rows);
      return result.rows;
    })
    .catch((err) => {
      console.log("Error of getAllReservations", err.message);
    });
  //return getAllProperties(null, 2);
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */

const getAllProperties = (options, limit = 10) => {
  // 1
  const queryParams = [];
  // 2
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  // 3
  // Filter by city
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  // Filter by owner id
  if (options.owner_id) {
    const operator = queryParams.length > 0 ? 'AND' : 'WHERE';
    queryParams.push(options.owner_id);
    queryString += `${operator} owner_id LIKE $${queryParams.length} `;
  }
  // Filter by price per night
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    const operator = queryParams.length > 0 ? 'AND' : 'WHERE';
    queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);
    queryString += `${operator} cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
  }
  // Filter by minimun rating
  if (options.minimum_rating) {
    const operator = queryParams.length > 0 ? 'AND' : 'WHERE';
    queryParams.push(options.minimum_rating);
    queryString += `${operator} rating >= $${queryParams.length} `;
  }
  // 4
  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // 5
  console.log(queryString, queryParams);

  // 6
  return pool.query(queryString, queryParams).then((res) => res.rows);
/*
  return pool
    .query(`SELECT * FROM properties LIMIT $1`, [limit])
    .then((result) => {
      //console.log("getAllProperties", result.rows);
      return result.rows;
    })
    .catch((err) => {
      console.log("Error of getAllProperties", err.message);
    });
    */
};

/*
const getAllProperties = function(options, limit = 10) {
  const limitedProperties = {};
  for (let i = 1; i <= limit; i++) {
    limitedProperties[i] = properties[i];
  }
  return Promise.resolve(limitedProperties);
}
*/
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = (property) => {
  return pool
    .query(`
    INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
    `, [`${property.owner_id}`, `${property.title}`, `${property.description}`, `${property.thumbnail_photo_url}`, `${property.cover_photo_url}`, `${property.cost_per_night}`, `${property.street}`, `${property.city}`, `${property.province}`, `${property.post_code}`, `${property.country}`, `${property.parking_spaces}`, `${property.number_of_bathrooms}`, `${property.number_of_bedrooms}`])
    .then((result) => {
      console.log("result of addProperty:", result.rows[0]);
      return result.rows[0];
    })
    .catch((err) => {
      console.log("Error of addProperty", err.message);
    })
  /*
  const propertyId = Object.keys(properties).length + 1;
  property.id = propertyId;
  properties[propertyId] = property;
  return Promise.resolve(property);
  */
};
exports.addProperty = addProperty;
