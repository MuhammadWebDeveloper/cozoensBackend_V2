// import { pool } from "../config/db.config.js";

// // =============================
// // CREATE SPACE (owner lists a new space)
// // POST /api/spaces
// // =============================
// // =============================
// // CREATE SPACE - Using Stored Procedure
// // =============================
// // =============================
// // CREATE SPACE - With One Space Per User Restriction
// // =============================
// export const createSpace = async (req, res) => {
//   try {
//     const owner_id = req.user.id;

//     // ✅ CHECK: Does user already have a space?
//     const existingSpaceCheck = await pool.query(
//       `SELECT id, name FROM spaces WHERE owner_id = $1 AND is_active = true`,
//       [owner_id]
//     );

//     if (existingSpaceCheck.rows.length > 0) {
//       const existingSpace = existingSpaceCheck.rows[0];
//       return res.status(403).json({
//         success: false,
//         message: `You already have a space "${existingSpace.name}". Each user can only create ONE space. You can add multiple units to your existing space.`,
//         existingSpaceId: existingSpace.id
//       });
//     }

//     const {
//       name, description,
//       address, city, area,
//       google_maps_link, latitude, longitude,
//       opening_time, closing_time, working_days,
//       has_wifi, has_ac, has_coffee, has_printer,
//       has_parking, has_security, has_backup_power,
//       cancellation_policy, refund_policy, late_arrival_policy,
//     } = req.body;

//     // Validate required fields
//     if (!name || !city) {
//       return res.status(400).json({
//         success: false,
//         message: "Space name and city are required",
//       });
//     }

//     // Call stored procedure
//     const result = await pool.query(
//       `SELECT sp_create_space(
//         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
//         $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
//         $21, $22
//       ) as response`,
//       [
//         owner_id,
//         name,
//         description || null,
//         address || null,
//         city,
//         area || null,
//         google_maps_link || null,
//         latitude || null,
//         longitude || null,
//         opening_time || null,
//         closing_time || null,
//         working_days || null,
//         has_wifi ?? false,
//         has_ac ?? false,
//         has_coffee ?? false,
//         has_printer ?? false,
//         has_parking ?? false,
//         has_security ?? false,
//         has_backup_power ?? false,
//         cancellation_policy || null,
//         refund_policy || null,
//         late_arrival_policy || null
//       ]
//     );

//     const response = result.rows[0]?.response;

//     if (!response.success) {
//       return res.status(400).json({
//         success: false,
//         message: response.message
//       });
//     }

//     return res.status(201).json({
//       success: true,
//       message: response.message,
//       space: response.space,
//       note: "You can now add multiple units (desks, cabins, meeting rooms) to your space."
//     });
//   } catch (error) {
//     console.error("createSpace error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };
// // =============================
// // ADD UNIT TO SPACE (owner adds open_desk, meeting_room etc.)
// // POST /api/spaces/:spaceId/units
// // =============================
// // =============================




// // ADD SPACE UNIT - Using Stored Procedure
// // =============================
// // export const addSpaceUnit = async (req, res) => {
// //   try {
// //     const { spaceId } = req.params;
// //     const owner_id = req.user.id;

// //     const {
// //       unit_type,
// //       name,
// //       total_capacity,
// //       hourly_rate,
// //       daily_rate,
// //       monthly_rate,
// //       images,
// //       duration,
// //       is_active
// //     } = req.body;

// //     // Validation
// //     const validUnitTypes = ['open_desk', 'dedicated_desk', 'private_cabin', 'meeting_room'];
// //     if (!unit_type || !validUnitTypes.includes(unit_type)) {
// //       return res.status(400).json({
// //         success: false,
// //         message: `Invalid unit_type. Must be one of: ${validUnitTypes.join(', ')}`
// //       });
// //     }

// //     if (!total_capacity) {
// //       return res.status(400).json({
// //         success: false,
// //         message: "Total capacity is required"
// //       });
// //     }

// //     // Handle Base64 images - Convert to JSONB array
// //     let imagesJsonb = [];
// //     if (images) {
// //       if (Array.isArray(images)) {
// //         // If already an array of Base64 strings
// //         imagesJsonb = images;
// //       } else if (typeof images === 'string') {
// //         try {
// //           // Try to parse as JSON array string
// //           const parsed = JSON.parse(images);
// //           if (Array.isArray(parsed)) {
// //             imagesJsonb = parsed;
// //           } else {
// //             imagesJsonb = [images];
// //           }
// //         } catch (e) {
// //           // If not JSON, treat as single Base64 string
// //           imagesJsonb = [images];
// //         }
// //       }
// //     }

// //     // Optional: Log warning for large Base64 strings
// //     if (imagesJsonb.length > 0) {
// //       const totalSize = imagesJsonb.reduce((sum, img) => sum + (img?.length || 0), 0);
// //       const avgSize = totalSize / imagesJsonb.length;
// //       if (avgSize > 500000) { // 500KB warning
// //         console.warn(`Large Base64 images detected (avg ${Math.round(avgSize / 1024)}KB). Consider optimizing.`);
// //       }
// //     }

// //     // Clean and parse numeric values
// //     const cleanTotalCapacity = total_capacity ? parseInt(total_capacity) : null;
// //     const cleanHourlyRate = hourly_rate ? parseFloat(hourly_rate) : null;
// //     const cleanDailyRate = daily_rate ? parseFloat(daily_rate) : null;
// //     const cleanMonthlyRate = monthly_rate ? parseFloat(monthly_rate) : null;

// //     // Call SP with JSONB parameter for images
// //     const result = await pool.query(
// //       `SELECT sp_add_space_unit(
// //         $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11
// //       ) as response`,
// //       [
// //         spaceId,                                    // $1: p_space_id
// //         owner_id,                                   // $2: p_owner_id
// //         unit_type,                                  // $3: p_unit_type
// //         name || null,                               // $4: p_name
// //         cleanTotalCapacity,                         // $5: p_total_capacity
// //         cleanHourlyRate,                            // $6: p_hourly_rate
// //         cleanDailyRate,                             // $7: p_daily_rate
// //         cleanMonthlyRate,                           // $8: p_monthly_rate
// //         JSON.stringify(imagesJsonb),                // $9: p_images (JSONB array of Base64)
// //         duration || null,                           // $10: p_duration
// //         is_active !== undefined ? is_active : true  // $11: p_is_active
// //       ]
// //     );

// //     const response = result.rows[0]?.response;

// //     if (!response || !response.success) {
// //       const statusCode = response?.message?.includes('already exists') ? 409 :
// //         response?.message?.includes('not found') ? 403 : 400;
// //       return res.status(statusCode).json({
// //         success: false,
// //         message: response?.message || "Failed to add unit"
// //       });
// //     }

// //     // Format the response data
// //     const unit = response.unit;
// //     if (unit) {
// //       // Convert string rates to numbers
// //       if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
// //       if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
// //       if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
// //       if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);

// //       // Images remain as JSONB/Base64 - no conversion needed
// //       // They will be returned as array of Base64 strings
// //     }

// //     return res.status(201).json({
// //       success: true,
// //       message: response.message,
// //       unit: unit
// //     });

// //   } catch (error) {
// //     console.error("addSpaceUnit error:", error.message);
// //     return res.status(500).json({
// //       success: false,
// //       message: "Server error",
// //       error: error.message
// //     });
// //   }
// // };

// // ============================================
// // ADD UNIT WITH MULTIPLE IMAGES (ONE PER ROW)
// // ============================================
// export const addSpaceUnit = async (req, res) => {
//   try {
//     const { spaceId } = req.params;
//     const owner_id = req.user.id;

//     const {
//       unit_type,
//       name,
//       total_capacity,
//       hourly_rate,
//       daily_rate,
//       monthly_rate,
//       images,        // Array of Base64 strings
//       duration,
//       is_active
//     } = req.body;

//     // Validation
//     const validUnitTypes = ['open_desk', 'dedicated_desk', 'private_cabin', 'meeting_room'];
//     if (!unit_type || !validUnitTypes.includes(unit_type)) {
//       return res.status(400).json({
//         success: false,
//         message: `Invalid unit_type. Must be one of: ${validUnitTypes.join(', ')}`
//       });
//     }

//     if (!total_capacity) {
//       return res.status(400).json({
//         success: false,
//         message: "Total capacity is required"
//       });
//     }

//     // Start transaction
//     const client = await pool.connect();

//     try {
//       await client.query('BEGIN');

//       // Step 1: Insert the unit (without images)
//       const insertUnitQuery = `
//         INSERT INTO space_units (
//           space_id, unit_type, name, total_capacity,
//           hourly_rate, daily_rate, monthly_rate,
//           duration, is_active, created_at, updated_at
//         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
//         RETURNING id
//       `;

//       const unitResult = await client.query(insertUnitQuery, [
//         spaceId, unit_type, name || null, total_capacity,
//         hourly_rate || null, daily_rate || null, monthly_rate || null,
//         duration || null, is_active !== undefined ? is_active : true
//       ]);

//       const unitId = unitResult.rows[0].id;

//       // Step 2: Insert each image as a separate row
//       if (images && Array.isArray(images) && images.length > 0) {
//         for (let i = 0; i < images.length; i++) {
//           const isPrimary = (i === 0); // First image is primary

//           await client.query(
//             `INSERT INTO unit_images (unit_id, image_base64, display_order, is_primary)
//              VALUES ($1, $2, $3, $4)`,
//             [unitId, images[i], i, isPrimary]
//           );
//         }
//       }

//       await client.query('COMMIT');

//       // Fetch complete unit with images
//       const completeUnit = await pool.query(
//         `SELECT 
//           u.id, u.name, u.unit_type, u.total_capacity,
//           u.hourly_rate, u.daily_rate, u.monthly_rate,
//           u.is_active, u.duration,
//           COALESCE(
//             (SELECT json_agg(
//               json_build_object(
//                 'id', ui.id,
//                 'image_base64', ui.image_base64,
//                 'display_order', ui.display_order,
//                 'is_primary', ui.is_primary
//               ) ORDER BY ui.display_order
//             ) FROM unit_images ui WHERE ui.unit_id = u.id),
//             '[]'::json
//           ) as images
//          FROM space_units u
//          WHERE u.id = $1`,
//         [unitId]
//       );

//       res.status(201).json({
//         success: true,
//         message: "Unit added successfully",
//         unit: completeUnit.rows[0]
//       });

//     } catch (error) {
//       await client.query('ROLLBACK');
//       throw error;
//     } finally {
//       client.release();
//     }

//   } catch (error) {
//     console.error("addSpaceUnit error:", error.message);
//     res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };









// // =============================
// // GET ALL SPACES (public - browse page)
// // GET /api/spaces?city=Lahore&type=meeting_room
// // =============================
// // =============================
// // GET ALL SPACES - Using Stored Procedure
// // =============================
// export const getAllSpaces = async (req, res) => {
//   try {
//     const { city, type } = req.query;

//     // Call the stored procedure with parameters (null = no filter)
//     const result = await pool.query(
//       `SELECT * FROM sp_get_all_spaces($1, $2)`,
//       [city || null, type || null]
//     );

//     return res.status(200).json({
//       success: true,
//       count: result.rows.length,
//       spaces: result.rows,
//     });
//   } catch (error) {
//     console.error("getAllSpaces error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

// // =============================
// // GET SINGLE SPACE (public - space detail page)
// // GET /api/spaces/:id
// // =============================
// // =============================
// // GET SPACE BY ID - Using JSON SP
// // =============================
// export const getSpaceById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const result = await pool.query(
//       `SELECT sp_get_space_by_id($1) as space_data`,
//       [id]
//     );

//     const space = result.rows[0]?.space_data;

//     if (!space || !space.id) {
//       return res.status(404).json({
//         success: false,
//         message: "Space not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       space: space,
//     });
//   } catch (error) {
//     console.error("getSpaceById error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

// // =============================
// // GET MY SPACES (owner sees their own listings)
// // GET /api/spaces/my-spaces
// // =============================

// export const getMySpaces = async (req, res) => {
//   try {
//     const owner_id = req.user.id;

//     // Get spaces
//     const spacesResult = await pool.query(
//       `SELECT sp_get_my_spaces($1::UUID) as spaces`,
//       [owner_id]
//     );

//     let spaces = spacesResult.rows[0]?.spaces || [];
//     if (typeof spaces === 'string') {
//       spaces = JSON.parse(spaces);
//     }

//     // Get units for each space separately
//     for (let space of spaces) {
//       const unitsResult = await pool.query(
//         `SELECT json_agg(
//             json_build_object(
//                 'id', u.id,
//                 'unit_type', u.unit_type,
//                 'name', u.name,
//                 'total_capacity', u.total_capacity,
//                 'hourly_rate', u.hourly_rate,
//                 'daily_rate', u.daily_rate,
//                 'monthly_rate', u.monthly_rate,
//                 'images', u.images,
//                 'duration', u.duration,
//                 'is_active', u.is_active
//             ) ORDER BY u.created_at ASC
//         ) as units
//         FROM space_units u
//        WHERE u.space_id = $1::UUID`,
//         [space.id]
//       );

//       space.units = unitsResult.rows[0]?.units || [];
//     }

//     return res.status(200).json({
//       success: true,
//       count: spaces.length,
//       spaces: spaces
//     });
//   } catch (error) {
//     console.error("getMySpaces error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error: " + error.message
//     });
//   }
// };

// // =============================
// // UPDATE SPACE (owner edits their listing)
// // PUT /api/spaces/:id
// // =============================
// // =============================
// // UPDATE SPACE - Using JSON SP
// // =============================
// export const updateSpace = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const owner_id = req.user.id;

//     const {
//       name, description,
//       address, city, area,
//       opening_time, closing_time, working_days,
//       has_wifi, has_ac, has_coffee, has_printer,
//       has_parking, has_security, has_backup_power,
//       cancellation_policy, refund_policy, late_arrival_policy,
//     } = req.body;

//     // Convert working_days to array if it's a string
//     let workingDaysArray = working_days;
//     if (working_days && typeof working_days === 'string') {
//       workingDaysArray = working_days.split(',').map(day => day.trim());
//     }
//     if (workingDaysArray && !Array.isArray(workingDaysArray)) {
//       workingDaysArray = [workingDaysArray];
//     }

//     // The stored procedure expects exactly 20 parameters (1-20)
//     const result = await pool.query(
//       `SELECT sp_update_space($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) as response`,
//       [
//         id,                                    // 1: p_space_id
//         owner_id,                              // 2: p_owner_id
//         name || null,                          // 3: p_name
//         description || null,                   // 4: p_description
//         address || null,                       // 5: p_address
//         city || null,                          // 6: p_city
//         area || null,                          // 7: p_area
//         opening_time || null,                  // 8: p_opening_time
//         closing_time || null,                  // 9: p_closing_time
//         workingDaysArray || null,              // 10: p_working_days (TEXT[])
//         has_wifi ?? false,                     // 11: p_has_wifi
//         has_ac ?? false,                       // 12: p_has_ac
//         has_coffee ?? false,                   // 13: p_has_coffee
//         has_printer ?? false,                  // 14: p_has_printer
//         has_parking ?? false,                  // 15: p_has_parking
//         has_security ?? false,                 // 16: p_has_security
//         has_backup_power ?? false,             // 17: p_has_backup_power
//         cancellation_policy || null,           // 18: p_cancellation_policy
//         refund_policy || null,                 // 19: p_refund_policy
//         late_arrival_policy || null            // 20: p_late_arrival_policy
//       ]
//     );

//     const response = result.rows[0]?.response;

//     if (!response) {
//       return res.status(500).json({
//         success: false,
//         message: "No response from stored procedure"
//       });
//     }

//     if (!response.success) {
//       return res.status(403).json({
//         success: false,
//         message: response.message,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: response.message,
//       space: response.space,
//     });
//   } catch (error) {
//     console.error("updateSpace error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };
// // =============================
// // DELETE SPACE (soft delete - owner)
// // DELETE /api/spaces/:id
// // =============================
// // =============================
// // DELETE SPACE - Using JSON SP
// // =============================
// export const deleteSpace = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const owner_id = req.user.id;

//     const result = await pool.query(
//       `SELECT sp_delete_space($1, $2) as result`,
//       [id, owner_id]
//     );

//     const response = result.rows[0]?.result;

//     if (!response.success) {
//       return res.status(403).json({
//         success: false,
//         message: response.message,
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: response.message,
//     });
//   } catch (error) {
//     console.error("deleteSpace error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };



// // GET ALL UNITS OF SPACE - Using JSON SP
// // =============================
// export const getAllUnitsOfSpace = async (req, res) => {
//   try {
//     const { spaceId } = req.params;

//     const result = await pool.query(
//       `SELECT sp_get_space_units($1) as data`,
//       [spaceId]
//     );

//     const response = result.rows[0]?.data;

//     if (!response || response.success === false) {
//       return res.status(404).json({
//         success: false,
//         message: response?.message || "Space not found",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       count: response.count,
//       space: response.space,
//       units: response.units,
//     });
//   } catch (error) {
//     console.error("getAllUnitsOfSpace error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };
// // =============================
// // GET SINGLE UNIT BY ID (public)
// // GET /api/spaces/:spaceId/units/:unitId
// // =============================
// // =============================
// // GET UNIT BY ID - Using JSON SP
// // =============================
// export const getUnitById = async (req, res) => {
//   try {
//     const { spaceId, unitId } = req.params;

//     const result = await pool.query(
//       `SELECT sp_get_unit_by_id($1, $2) as unit_data`,
//       [unitId, spaceId]
//     );

//     const unit = result.rows[0]?.unit_data;

//     if (!unit) {
//       return res.status(404).json({
//         success: false,
//         message: "Unit not found in this space",
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       unit: unit,
//     });
//   } catch (error) {
//     console.error("getUnitById error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

// // =============================
// // UPDATE UNIT - Using Stored Procedures
// // =============================

// export const updateUnit = async (req, res) => {
//   try {
//     const { spaceId, unitId } = req.params;
//     const owner_id = req.user.id;

//     const {
//       name,
//       unit_type,
//       total_capacity,
//       hourly_rate,
//       daily_rate,
//       monthly_rate,
//       images,
//       duration,
//       is_active
//     } = req.body;

//     // Check if any fields were provided for update
//     const hasAnyUpdate = [
//       name, unit_type, total_capacity,
//       hourly_rate, daily_rate, monthly_rate,
//       images, duration, is_active
//     ].some(field => field !== undefined && field !== null);

//     // If no fields to update, just fetch the unit
//     if (!hasAnyUpdate) {
//       const getUnit = await pool.query(
//         `SELECT row_to_json(space_units.*) as unit FROM space_units 
//          WHERE id = $1::uuid AND space_id = $2::uuid`,
//         [unitId, spaceId]
//       );

//       if (getUnit.rows.length === 0) {
//         return res.status(404).json({ success: false, message: "Unit not found" });
//       }

//       const unit = getUnit.rows[0].unit;
//       if (unit) {
//         if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
//         if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
//         if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
//         if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);
//       }

//       return res.status(200).json({
//         success: true,
//         message: "No fields to update",
//         unit: unit
//       });
//     }

//     // Handle images conversion
//     let imagesArray = null;
//     if (images !== undefined && images !== null) {
//       if (Array.isArray(images)) {
//         imagesArray = images;
//       } else if (typeof images === 'string') {
//         try {
//           imagesArray = JSON.parse(images);
//         } catch (e) {
//           imagesArray = [images];
//         }
//       }
//     }

//     // Clean and parse numeric values
//     const cleanHourly = hourly_rate !== undefined && hourly_rate !== null ? parseFloat(hourly_rate) : null;
//     const cleanDaily = daily_rate !== undefined && daily_rate !== null ? parseFloat(daily_rate) : null;
//     const cleanMonthly = monthly_rate !== undefined && monthly_rate !== null ? parseFloat(monthly_rate) : null;
//     const cleanTotalCapacity = total_capacity !== undefined && total_capacity !== null ? parseInt(total_capacity) : null;

//     // Single call to sp_update_unit with all 12 parameters - CAST TO UUID
//     const updateResult = await pool.query(
//       `SELECT sp_update_unit(
//   $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12
// ) as response`,
//       [
//         unitId,                                    // $1: p_unit_id (cast to uuid)
//         spaceId,                                   // $2: p_space_id (cast to uuid)
//         owner_id,                                  // $3: p_owner_id (cast to uuid)
//         name !== undefined ? name : null,          // $4: p_name
//         unit_type !== undefined ? unit_type : null, // $5: p_unit_type
//         cleanTotalCapacity,                        // $6: p_total_capacity
//         cleanHourly,                               // $7: p_hourly_rate
//         cleanDaily,                                // $8: p_daily_rate
//         cleanMonthly,                              // $9: p_monthly_rate
//         imagesArray ? JSON.stringify(imagesArray) : null,                               // $10: p_images (text[])
//         duration !== undefined ? duration : null,  // $11: p_duration
//         is_active !== undefined ? is_active : null // $12: p_is_active
//       ]
//     );

//     const result = updateResult.rows[0]?.response;

//     // Check if the SP returned an error
//     if (!result || !result.success) {
//       return res.status(400).json({
//         success: false,
//         message: result?.message || "Update failed"
//       });
//     }

//     // Format response
//     const unit = result.unit;
//     if (unit) {
//       if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
//       if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
//       if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
//       if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);
//     }

//     return res.status(200).json({
//       success: true,
//       message: result.message,
//       unit: unit
//     });

//   } catch (error) {
//     console.error("updateUnit error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };



// // =============================
// // DELETE UNIT - Using Single SP
// // =============================
// export const deleteUnit = async (req, res) => {
//   try {
//     const { spaceId, unitId } = req.params;
//     const owner_id = req.user.id;

//     const result = await pool.query(
//       `SELECT sp_delete_unit($1, $2, $3) as response`,
//       [unitId, spaceId, owner_id]
//     );

//     const response = result.rows[0]?.response;

//     if (!response.success) {
//       const statusCode = response.message.includes('not found') ? 404 :
//         response.message.includes('already deleted') ? 400 : 403;
//       return res.status(statusCode).json({
//         success: false,
//         message: response.message
//       });
//     }

//     return res.status(200).json({
//       success: true,
//       message: response.message,
//       data: response.data
//     });
//   } catch (error) {
//     console.error("deleteUnit error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };

// // =============================
// // GET ALL OPEN DESKS
// // =============================
// export const getOpenDesks = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT * FROM sp_get_units_by_type($1, $2)`,
//       ['open_desk', 50]
//     );
//     // Format the response to return numbers instead of strings
//     const formattedUnits = result.rows.map(unit => ({
//       ...unit,
//       hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
//       daily_rate: parseFloat(unit.daily_rate),
//       monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
//       total_capacity: parseInt(unit.total_capacity)
//     }));

//     return res.status(200).json({
//       success: true,
//       unit_type: "open_desk",
//       display_name: "Open Desks",
//       total_count: formattedUnits.length,
//       units: formattedUnits
//     });

//   } catch (error) {
//     console.error("getOpenDesks error:", error.message);
//     console.error("Full error:", error);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };



// // =============================
// // GET ALL DEDICATED DESKS - Using SP
// // =============================
// export const getDedicatedDesks = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT * FROM sp_get_units_by_type($1, $2)`,
//       ['dedicated_desk', 50]
//     );

//     const formattedUnits = result.rows.map(unit => ({
//       id: unit.id,
//       space_id: unit.space_id,
//       unit_type: unit.unit_type,
//       name: unit.name,
//       space_name: unit.space_name,
//       city: unit.city,
//       address: unit.address,
//       total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
//       hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
//       daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : 0,
//       monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
//       images: unit.images || [],
//       duration: unit.duration,
//       is_active: unit.is_active,
//       is_verified: unit.is_verified,
//       created_at: unit.created_at,
//       updated_at: unit.updated_at
//     }));

//     return res.status(200).json({
//       success: true,
//       unit_type: "dedicated_desk",
//       display_name: "Dedicated Desks",
//       total_count: formattedUnits.length,
//       units: formattedUnits
//     });

//   } catch (error) {
//     console.error("getDedicatedDesks error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };
// // =============================
// // GET ALL PRIVATE CABINS
// // =============================
// export const getPrivateCabins = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT * FROM sp_get_units_by_type($1, $2)`,
//       ['private_cabin', 50]
//     );
//     // Format the response to return numbers instead of strings
//     const formattedUnits = result.rows.map(unit => ({
//       id: unit.id,
//       space_id: unit.space_id,
//       unit_type: unit.unit_type,
//       name: unit.name || unit.space_name,
//       space_name: unit.space_name,
//       city: unit.city,
//       address: unit.address,
//       total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
//       hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
//       daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : 0,
//       monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
//       images: unit.images || [],
//       duration: unit.duration,
//       is_active: unit.is_active,
//       is_verified: unit.is_verified,
//       created_at: unit.created_at,
//       updated_at: unit.updated_at
//     }));

//     return res.status(200).json({
//       success: true,
//       unit_type: "private_cabin",
//       display_name: "Private Cabins",
//       total_count: formattedUnits.length,
//       units: formattedUnits
//     });

//   } catch (error) {
//     console.error("getPrivateCabins error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };

// // =============================
// // GET ALL MEETING ROOMS
// // =============================
// export const getMeetingRooms = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT * FROM sp_get_units_by_type($1, $2)`,
//       ['meeting_room', 50]
//     );

//     // Format the response to return numbers instead of strings
//     const formattedUnits = result.rows.map(unit => ({
//       id: unit.id,
//       space_id: unit.space_id,
//       unit_type: unit.unit_type,
//       name: unit.name || unit.space_name,
//       space_name: unit.space_name,
//       city: unit.city,
//       address: unit.address,
//       total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
//       hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
//       daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : 0,
//       monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
//       images: unit.images || [],
//       duration: unit.duration,
//       is_active: unit.is_active,
//       is_verified: unit.is_verified,
//       created_at: unit.created_at,
//       updated_at: unit.updated_at
//     }));

//     return res.status(200).json({
//       success: true,
//       unit_type: "meeting_room",
//       display_name: "Meeting Rooms",
//       total_count: formattedUnits.length,
//       units: formattedUnits
//     });

//   } catch (error) {
//     console.error("getMeetingRooms error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };

// // =============================
// // GET SINGLE UNIT DETAILS - Using Stored Procedure
// // =============================
// export const getUnitDetails = async (req, res) => {
//   try {
//     const { unitId } = req.params;

//     // Call stored procedure
//     const result = await pool.query(
//       `SELECT sp_get_unit_details($1) as unit_data`,
//       [unitId]
//     );

//     const unit = result.rows[0]?.unit_data;

//     // Check if unit exists
//     if (!unit) {
//       return res.status(404).json({
//         success: false,
//         message: "Unit not found"
//       });
//     }

//     // Format rates to numbers (if needed, SP should return proper types)
//     if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
//     if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
//     if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
//     if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);

//     return res.status(200).json({
//       success: true,
//       unit: unit
//     });

//   } catch (error) {
//     console.error("getUnitDetails error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };





import { pool } from "../config/db.config.js";

// =============================
// CREATE SPACE (owner lists a new space)
// POST /api/spaces
// =============================
export const createSpace = async (req, res) => {
  try {
    const owner_id = req.user.id;

    // ✅ CHECK: Does user already have a space?
    const existingSpaceCheck = await pool.query(
      `SELECT id, name FROM spaces WHERE owner_id = $1 AND is_active = true`,
      [owner_id]
    );

    if (existingSpaceCheck.rows.length > 0) {
      const existingSpace = existingSpaceCheck.rows[0];
      return res.status(403).json({
        success: false,
        message: `You already have a space "${existingSpace.name}". Each user can only create ONE space. You can add multiple units to your existing space.`,
        existingSpaceId: existingSpace.id
      });
    }

    const {
      name, description,
      address, city, area,
      google_maps_link, latitude, longitude,
      opening_time, closing_time, working_days,
      has_wifi, has_ac, has_coffee, has_printer,
      has_parking, has_security, has_backup_power,
      cancellation_policy, refund_policy, late_arrival_policy,
    } = req.body;

    // Validate required fields
    if (!name || !city) {
      return res.status(400).json({
        success: false,
        message: "Space name and city are required",
      });
    }

    // Call stored procedure
    const result = await pool.query(
      `SELECT sp_create_space(
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22
      ) as response`,
      [
        owner_id,
        name,
        description || null,
        address || null,
        city,
        area || null,
        google_maps_link || null,
        latitude || null,
        longitude || null,
        opening_time || null,
        closing_time || null,
        working_days || null,
        has_wifi ?? false,
        has_ac ?? false,
        has_coffee ?? false,
        has_printer ?? false,
        has_parking ?? false,
        has_security ?? false,
        has_backup_power ?? false,
        cancellation_policy || null,
        refund_policy || null,
        late_arrival_policy || null
      ]
    );

    const response = result.rows[0]?.response;

    if (!response.success) {
      return res.status(400).json({
        success: false,
        message: response.message
      });
    }

    return res.status(201).json({
      success: true,
      message: response.message,
      space: response.space,
      note: "You can now add multiple units (desks, cabins, meeting rooms) to your space."
    });
  } catch (error) {
    console.error("createSpace error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// =============================
// ADD UNIT WITH MULTIPLE IMAGES (ONE PER ROW IN unit_images TABLE)
// POST /api/spaces/:spaceId/addunits
// =============================
export const addSpaceUnit = async (req, res) => {
  try {
    const { spaceId } = req.params;
    const owner_id = req.user.id;

    const {
      unit_type,
      name,
      total_capacity,
      hourly_rate,
      daily_rate,
      monthly_rate,
      images,        // Array of Base64 strings
      duration,
      is_active
    } = req.body;

    // Validation
    const validUnitTypes = ['open_desk', 'dedicated_desk', 'private_cabin', 'meeting_room'];
    if (!unit_type || !validUnitTypes.includes(unit_type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid unit_type. Must be one of: ${validUnitTypes.join(', ')}`
      });
    }

    if (!total_capacity) {
      return res.status(400).json({
        success: false,
        message: "Total capacity is required"
      });
    }

    // Verify space ownership
    const spaceCheck = await pool.query(
      `SELECT id FROM spaces WHERE id = $1 AND owner_id = $2 AND is_active = true`,
      [spaceId, owner_id]
    );

    if (spaceCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Space not found or you don't have permission"
      });
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Step 1: Insert the unit (without images)
      const insertUnitQuery = `
        INSERT INTO space_units (
          space_id, unit_type, name, total_capacity,
          hourly_rate, daily_rate, monthly_rate,
          duration, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        RETURNING id
      `;

      const unitResult = await client.query(insertUnitQuery, [
        spaceId, unit_type, name || null, total_capacity,
        hourly_rate || null, daily_rate || null, monthly_rate || null,
        duration || null, is_active !== undefined ? is_active : true
      ]);

      const unitId = unitResult.rows[0].id;

      // Step 2: Insert each image as a separate row in unit_images table
      if (images && Array.isArray(images) && images.length > 0) {
        for (let i = 0; i < images.length; i++) {
          const isPrimary = (i === 0); // First image is primary

          await client.query(
            `INSERT INTO unit_images (unit_id, image_base64, display_order, is_primary, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [unitId, images[i], i, isPrimary]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch complete unit with images from unit_images table
      const completeUnit = await pool.query(
        `SELECT 
          u.id, u.name, u.unit_type, u.total_capacity,
          u.hourly_rate, u.daily_rate, u.monthly_rate,
          u.is_active, u.duration, u.created_at, u.updated_at,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', ui.id,
                'image_base64', ui.image_base64,
                'display_order', ui.display_order,
                'is_primary', ui.is_primary
              ) ORDER BY ui.display_order
            ) FROM unit_images ui WHERE ui.unit_id = u.id),
            '[]'::json
          ) as images
         FROM space_units u
         WHERE u.id = $1`,
        [unitId]
      );

      res.status(201).json({
        success: true,
        message: "Unit added successfully",
        unit: completeUnit.rows[0]
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("addSpaceUnit error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// GET ALL SPACES (public - browse page)
// GET /api/spaces?city=Lahore&type=meeting_room
// =============================
// export const getAllSpaces = async (req, res) => {
//   try {
//     const { city, type } = req.query;

//     // Build query with unit_images join
//     let query = `
//       SELECT DISTINCT
//         s.id, s.name, s.description, s.address, s.city, s.area,
//         s.latitude, s.longitude, s.google_maps_link,
//         s.opening_time, s.closing_time, s.working_days,
//         s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
//         s.has_parking, s.has_security, s.has_backup_power,
//         s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
//         s.is_active, s.is_verified, s.created_at, s.updated_at,
//         COALESCE(
//           (SELECT json_agg(
//             json_build_object(
//               'id', u.id,
//               'unit_type', u.unit_type,
//               'name', u.name,
//               'total_capacity', u.total_capacity,
//               'hourly_rate', u.hourly_rate,
//               'daily_rate', u.daily_rate,
//               'monthly_rate', u.monthly_rate,
//               'duration', u.duration,
//               'images', COALESCE(
//                 (SELECT json_agg(
//                   json_build_object(
//                     'id', ui.id,
//                     'image_base64', ui.image_base64,
//                     'display_order', ui.display_order,
//                     'is_primary', ui.is_primary
//                   ) ORDER BY ui.display_order
//                 ) FROM unit_images ui WHERE ui.unit_id = u.id),
//                 '[]'::json
//               )
//             )
//           ) FROM space_units u WHERE u.space_id = s.id AND u.is_active = true),
//           '[]'::json
//         ) as units
//       FROM spaces s
//       WHERE s.is_active = true
//     `;

//     const queryParams = [];
//     let paramIndex = 1;

//     if (city) {
//       query += ` AND s.city ILIKE $${paramIndex}`;
//       queryParams.push(`%${city}%`);
//       paramIndex++;
//     }

//     if (type) {
//       query += ` AND EXISTS (
//         SELECT 1 FROM space_units u 
//         WHERE u.space_id = s.id AND u.unit_type = $${paramIndex} AND u.is_active = true
//       )`;
//       queryParams.push(type);
//       paramIndex++;
//     }

//     query += ` ORDER BY s.created_at DESC`;

//     const result = await pool.query(query, queryParams);

//     return res.status(200).json({
//       success: true,
//       count: result.rows.length,
//       spaces: result.rows,
//     });
//   } catch (error) {
//     console.error("getAllSpaces error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };


export const getAllSpaces = async (req, res) => {
  try {
    const { city, type } = req.query;

    // First, get distinct spaces without the JSON aggregation
    let baseQuery = `
      SELECT DISTINCT
        s.id, s.name, s.description, s.address, s.city, s.area,
        s.latitude, s.longitude, s.google_maps_link,
        s.opening_time, s.closing_time, s.working_days,
        s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
        s.has_parking, s.has_security, s.has_backup_power,
        s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
        s.is_active, s.is_verified, s.created_at, s.updated_at,
        s.cover_image, s.gallery_images
      FROM spaces s
      WHERE s.is_active = true
    `;

    const queryParams = [];
    let paramIndex = 1;

    if (city) {
      baseQuery += ` AND s.city ILIKE $${paramIndex}`;
      queryParams.push(`%${city}%`);
      paramIndex++;
    }

    if (type) {
      baseQuery += ` AND EXISTS (
        SELECT 1 FROM space_units u 
        WHERE u.space_id = s.id AND u.unit_type = $${paramIndex} AND u.is_active = true
      )`;
      queryParams.push(type);
      paramIndex++;
    }

    baseQuery += ` ORDER BY s.created_at DESC`;

    // Get spaces first
    const spacesResult = await pool.query(baseQuery, queryParams);

    // Then fetch units for each space separately
    const spacesWithUnits = await Promise.all(
      spacesResult.rows.map(async (space) => {
        const unitsQuery = `
          SELECT 
            u.id, u.unit_type, u.name, u.total_capacity,
            u.hourly_rate, u.daily_rate, u.monthly_rate, u.duration,
            COALESCE(
              (SELECT json_agg(
                json_build_object(
                  'id', ui.id,
                  'image_base64', ui.image_base64,
                  'display_order', ui.display_order,
                  'is_primary', ui.is_primary
                ) ORDER BY ui.display_order
              ) FROM unit_images ui WHERE ui.unit_id = u.id),
              '[]'::json
            ) as images
          FROM space_units u
          WHERE u.space_id = $1 AND u.is_active = true
        `;

        const unitsResult = await pool.query(unitsQuery, [space.id]);

        return {
          ...space,
          units: unitsResult.rows
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: spacesWithUnits.length,
      spaces: spacesWithUnits,
    });
  } catch (error) {
    console.error("getAllSpaces error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// GET SINGLE SPACE (public - space detail page)
// GET /api/spaces/:id
// =============================
export const getSpaceById = async (req, res) => {
  try {
    const { id } = req.params;

    const query = `
      SELECT 
        s.id, s.name, s.description, s.address, s.city, s.area,
        s.latitude, s.longitude, s.google_maps_link,
        s.opening_time, s.closing_time, s.working_days,
        s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
        s.has_parking, s.has_security, s.has_backup_power,
        s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
        s.is_active, s.is_verified, s.created_at, s.updated_at,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', u.id,
              'unit_type', u.unit_type,
              'name', u.name,
              'total_capacity', u.total_capacity,
              'hourly_rate', u.hourly_rate,
              'daily_rate', u.daily_rate,
              'monthly_rate', u.monthly_rate,
              'duration', u.duration,
              'is_active', u.is_active,
              'images', COALESCE(
                (SELECT json_agg(
                  json_build_object(
                    'id', ui.id,
                    'image_base64', ui.image_base64,
                    'display_order', ui.display_order,
                    'is_primary', ui.is_primary
                  ) ORDER BY ui.display_order
                ) FROM unit_images ui WHERE ui.unit_id = u.id),
                '[]'::json
              )
            ) ORDER BY u.created_at ASC
          ) FROM space_units u WHERE u.space_id = s.id AND u.is_active = true),
          '[]'::json
        ) as units
      FROM spaces s
      WHERE s.id = $1 AND s.is_active = true
    `;

    const result = await pool.query(query, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
      });
    }

    return res.status(200).json({
      success: true,
      space: result.rows[0],
    });
  } catch (error) {
    console.error("getSpaceById error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// =============================
// GET MY SPACES (owner sees their own listings)
// GET /api/spaces/my-spaces
// // =============================
// export const getMySpaces = async (req, res) => {
//   try {
//     const owner_id = req.user.id;

//     // Get spaces with units and their images
//     const result = await pool.query(
//       `SELECT 
//         s.id, s.name, s.description, s.address, s.city, s.area,
//         s.latitude, s.longitude, s.google_maps_link,
//         s.opening_time, s.closing_time, s.working_days,
//         s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
//         s.has_parking, s.has_security, s.has_backup_power,
//         s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
//         s.is_active, s.is_verified, s.created_at, s.updated_at,
//         COALESCE(
//           (SELECT json_agg(
//             json_build_object(
//               'id', u.id,
//               'unit_type', u.unit_type,
//               'name', u.name,
//               'total_capacity', u.total_capacity,
//               'hourly_rate', u.hourly_rate,
//               'daily_rate', u.daily_rate,
//               'monthly_rate', u.monthly_rate,
//               'duration', u.duration,
//               'is_active', u.is_active,
//               'images', COALESCE(
//                 (SELECT json_agg(
//                   json_build_object(
//                     'id', ui.id,
//                     'image_base64', ui.image_base64,
//                     'display_order', ui.display_order,
//                     'is_primary', ui.is_primary
//                   ) ORDER BY ui.display_order
//                 ) FROM unit_images ui WHERE ui.unit_id = u.id),
//                 '[]'::json
//               )
//             ) ORDER BY u.created_at ASC
//           ) FROM space_units u WHERE u.space_id = s.id AND u.is_active = true),
//           '[]'::json
//         ) as units
//       FROM spaces s
//       WHERE s.owner_id = $1 AND s.is_active = true
//       ORDER BY s.created_at DESC`,
//       [owner_id]
//     );

//     return res.status(200).json({
//       success: true,
//       count: result.rows.length,
//       spaces: result.rows
//     });
//   } catch (error) {
//     console.error("getMySpaces error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error: " + error.message
//     });
//   }
// };


// =============================
// GET MY SPACES (owner sees their own listings - ALL units including inactive)
// GET /api/spaces/owner/my-spaces
// =============================
export const getMySpaces = async (req, res) => {
  try {
    const owner_id = req.user.id;

    // Get spaces with units (NO images for faster response)
    const result = await pool.query(
      `SELECT 
        s.id, s.name, s.description, s.address, s.city, s.area,
        s.latitude, s.longitude, s.google_maps_link,
        s.opening_time, s.closing_time, s.working_days,
        s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
        s.has_parking, s.has_security, s.has_backup_power,
        s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
        s.is_active, s.is_verified, s.created_at, s.updated_at,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', u.id,
              'unit_type', u.unit_type,
              'name', u.name,
              'total_capacity', u.total_capacity,
              'hourly_rate', u.hourly_rate,
              'daily_rate', u.daily_rate,
              'monthly_rate', u.monthly_rate,
              'duration', u.duration,
              'is_active', u.is_active
            ) ORDER BY u.is_active DESC, u.created_at ASC
          ) FROM space_units u WHERE u.space_id = s.id),
          '[]'::json
        ) as units
      FROM spaces s
      WHERE s.owner_id = $1 AND s.is_active = true
      ORDER BY s.created_at DESC`,
      [owner_id]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      spaces: result.rows
    });
  } catch (error) {
    console.error("getMySpaces error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error: " + error.message
    });
  }
};



// =============================
// UPDATE SPACE (owner edits their listing)
// PUT /api/spaces/:id
// =============================
export const updateSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.id;

    const {
      name, description,
      address, city, area,
      opening_time, closing_time, working_days,
      has_wifi, has_ac, has_coffee, has_printer,
      has_parking, has_security, has_backup_power,
      cancellation_policy, refund_policy, late_arrival_policy,
    } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description || null);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      values.push(address || null);
    }
    if (city !== undefined) {
      updates.push(`city = $${paramIndex++}`);
      values.push(city);
    }
    if (area !== undefined) {
      updates.push(`area = $${paramIndex++}`);
      values.push(area || null);
    }
    if (opening_time !== undefined) {
      updates.push(`opening_time = $${paramIndex++}`);
      values.push(opening_time || null);
    }
    if (closing_time !== undefined) {
      updates.push(`closing_time = $${paramIndex++}`);
      values.push(closing_time || null);
    }
    if (working_days !== undefined) {
      updates.push(`working_days = $${paramIndex++}`);
      values.push(working_days || null);
    }
    if (has_wifi !== undefined) {
      updates.push(`has_wifi = $${paramIndex++}`);
      values.push(has_wifi);
    }
    if (has_ac !== undefined) {
      updates.push(`has_ac = $${paramIndex++}`);
      values.push(has_ac);
    }
    if (has_coffee !== undefined) {
      updates.push(`has_coffee = $${paramIndex++}`);
      values.push(has_coffee);
    }
    if (has_printer !== undefined) {
      updates.push(`has_printer = $${paramIndex++}`);
      values.push(has_printer);
    }
    if (has_parking !== undefined) {
      updates.push(`has_parking = $${paramIndex++}`);
      values.push(has_parking);
    }
    if (has_security !== undefined) {
      updates.push(`has_security = $${paramIndex++}`);
      values.push(has_security);
    }
    if (has_backup_power !== undefined) {
      updates.push(`has_backup_power = $${paramIndex++}`);
      values.push(has_backup_power);
    }
    if (cancellation_policy !== undefined) {
      updates.push(`cancellation_policy = $${paramIndex++}`);
      values.push(cancellation_policy || null);
    }
    if (refund_policy !== undefined) {
      updates.push(`refund_policy = $${paramIndex++}`);
      values.push(refund_policy || null);
    }
    if (late_arrival_policy !== undefined) {
      updates.push(`late_arrival_policy = $${paramIndex++}`);
      values.push(late_arrival_policy || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No fields to update"
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, owner_id);

    const updateQuery = `
      UPDATE spaces 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex++} AND owner_id = $${paramIndex++} AND is_active = true
      RETURNING *
    `;

    const result = await pool.query(updateQuery, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Space not found or you don't have permission"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Space updated successfully",
      space: result.rows[0],
    });
  } catch (error) {
    console.error("updateSpace error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// DELETE SPACE (soft delete - owner)
// DELETE /api/spaces/:id
// =============================
export const deleteSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.id;

    const result = await pool.query(
      `UPDATE spaces 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND owner_id = $2 AND is_active = true
       RETURNING id, name`,
      [id, owner_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Space not found or already deleted"
      });
    }

    return res.status(200).json({
      success: true,
      message: `Space "${result.rows[0].name}" deleted successfully`,
    });
  } catch (error) {
    console.error("deleteSpace error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// // =============================
// // GET ALL UNITS OF SPACE
// // GET /api/spaces/:spaceId/units
// // =============================
// export const getAllUnitsOfSpace = async (req, res) => {
//   try {
//     const { spaceId } = req.params;

//     // Check if space exists
//     const spaceCheck = await pool.query(
//       `SELECT id, name FROM spaces WHERE id = $1 AND is_active = true`,
//       [spaceId]
//     );

//     if (spaceCheck.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Space not found",
//       });
//     }

//     // Get all units with their images from unit_images table
//     const unitsResult = await pool.query(
//       `SELECT 
//         u.id, u.unit_type, u.name, u.total_capacity,
//         u.hourly_rate, u.daily_rate, u.monthly_rate,
//         u.duration, u.is_active, u.created_at, u.updated_at,
//         COALESCE(
//           (SELECT json_agg(
//             json_build_object(
//               'id', ui.id,
//               'image_base64', ui.image_base64,
//               'display_order', ui.display_order,
//               'is_primary', ui.is_primary
//             ) ORDER BY ui.display_order
//           ) FROM unit_images ui WHERE ui.unit_id = u.id),
//           '[]'::json
//         ) as images
//       FROM space_units u
//       WHERE u.space_id = $1 AND u.is_active = true
//       ORDER BY u.created_at ASC`,
//       [spaceId]
//     );

//     return res.status(200).json({
//       success: true,
//       count: unitsResult.rows.length,
//       space: spaceCheck.rows[0],
//       units: unitsResult.rows,
//     });
//   } catch (error) {
//     console.error("getAllUnitsOfSpace error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };

// =============================
// GET ALL UNITS OF SPACE (Owner sees ALL units including inactive)
// GET /api/spaces/:spaceId/units
// =============================
// export const getAllUnitsOfSpace = async (req, res) => {
//   try {
//     const { spaceId } = req.params;

//     // Check if space exists
//     const spaceCheck = await pool.query(
//       `SELECT id, name FROM spaces WHERE id = $1 AND is_active = true`,
//       [spaceId]
//     );

//     if (spaceCheck.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Space not found",
//       });
//     }

//     // Get ALL units (both active AND inactive) with their images
//     const unitsResult = await pool.query(
//       `SELECT 
//         u.id, u.unit_type, u.name, u.total_capacity,
//         u.hourly_rate, u.daily_rate, u.monthly_rate,
//         u.duration, u.is_active, u.created_at, u.updated_at,
//         COALESCE(
//           (SELECT json_agg(
//             json_build_object(
//               'id', ui.id,
//               'image_base64', ui.image_base64,
//               'display_order', ui.display_order,
//               'is_primary', ui.is_primary
//             ) ORDER BY ui.display_order
//           ) FROM unit_images ui WHERE ui.unit_id = u.id),
//           '[]'::json
//         ) as images
//       FROM space_units u
//       WHERE u.space_id = $1
//       -- 👆 REMOVED "AND u.is_active = true" - Now shows ALL units
//       ORDER BY u.is_active DESC, u.created_at ASC`,
//       // 👆 Active units first, then inactive, both sorted by creation date
//       [spaceId]
//     );

//     return res.status(200).json({
//       success: true,
//       count: unitsResult.rows.length,
//       active_count: unitsResult.rows.filter(u => u.is_active).length,    // 👈 ADDED
//       inactive_count: unitsResult.rows.filter(u => !u.is_active).length, // 👈 ADDED
//       space: spaceCheck.rows[0],
//       units: unitsResult.rows,
//     });
//   } catch (error) {
//     console.error("getAllUnitsOfSpace error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error"
//     });
//   }
// };





// =============================
// GET ALL UNITS OF SPACE (Owner sees ALL units including inactive)
// GET /api/spaces/:spaceId/units
// =============================
export const getAllUnitsOfSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;

    // Check if space exists
    const spaceCheck = await pool.query(
      `SELECT id, name FROM spaces WHERE id = $1 AND is_active = true`,
      [spaceId]
    );

    if (spaceCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
      });
    }

    // Get ALL units (both active AND inactive) - WITHOUT images
    const unitsResult = await pool.query(
      `SELECT 
        u.id, u.unit_type, u.name, u.total_capacity,
        u.hourly_rate, u.daily_rate, u.monthly_rate,
        u.duration, u.is_active, u.created_at, u.updated_at
      FROM space_units u
      WHERE u.space_id = $1
      ORDER BY u.is_active DESC, u.created_at ASC`,
      [spaceId]
    );

    return res.status(200).json({
      success: true,
      count: unitsResult.rows.length,
      active_count: unitsResult.rows.filter(u => u.is_active).length,
      inactive_count: unitsResult.rows.filter(u => !u.is_active).length,
      space: spaceCheck.rows[0],
      units: unitsResult.rows,
    });
  } catch (error) {
    console.error("getAllUnitsOfSpace error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};


// =============================
// GET SINGLE UNIT BY ID
// GET /api/spaces/:spaceId/units/:unitId
// =============================
export const getUnitById = async (req, res) => {
  try {
    const { spaceId, unitId } = req.params;

    const result = await pool.query(
      `SELECT 
        u.id, u.unit_type, u.name, u.total_capacity,
        u.hourly_rate, u.daily_rate, u.monthly_rate,
        u.duration, u.is_active, u.created_at, u.updated_at,
        COALESCE(
          (SELECT json_agg(
            json_build_object(
              'id', ui.id,
              'image_base64', ui.image_base64,
              'display_order', ui.display_order,
              'is_primary', ui.is_primary
            ) ORDER BY ui.display_order
          ) FROM unit_images ui WHERE ui.unit_id = u.id),
          '[]'::json
        ) as images
      FROM space_units u
      WHERE u.id = $1 AND u.space_id = $2 AND u.is_active = true`,
      [unitId, spaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found in this space",
      });
    }

    const unit = result.rows[0];
    if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
    if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
    if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
    if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);

    return res.status(200).json({
      success: true,
      unit: unit,
    });
  } catch (error) {
    console.error("getUnitById error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// =============================
// UPDATE UNIT
// PUT /api/spaces/:spaceId/units/:unitId
// =============================
export const updateUnit = async (req, res) => {
  try {
    const { spaceId, unitId } = req.params;
    const owner_id = req.user.id;

    const {
      name,
      unit_type,
      total_capacity,
      hourly_rate,
      daily_rate,
      monthly_rate,
      images,
      duration,
      is_active
    } = req.body;

    // Verify ownership through space
    const spaceCheck = await pool.query(
      `SELECT id FROM spaces WHERE id = $1 AND owner_id = $2 AND is_active = true`,
      [spaceId, owner_id]
    );

    if (spaceCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to update this unit"
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Build dynamic update query for unit
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(name || null);
      }
      if (unit_type !== undefined) {
        updates.push(`unit_type = $${paramIndex++}`);
        values.push(unit_type);
      }
      if (total_capacity !== undefined) {
        updates.push(`total_capacity = $${paramIndex++}`);
        values.push(total_capacity);
      }
      if (hourly_rate !== undefined) {
        updates.push(`hourly_rate = $${paramIndex++}`);
        values.push(hourly_rate || null);
      }
      if (daily_rate !== undefined) {
        updates.push(`daily_rate = $${paramIndex++}`);
        values.push(daily_rate || null);
      }
      if (monthly_rate !== undefined) {
        updates.push(`monthly_rate = $${paramIndex++}`);
        values.push(monthly_rate || null);
      }
      if (duration !== undefined) {
        updates.push(`duration = $${paramIndex++}`);
        values.push(duration || null);
      }
      if (is_active !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(is_active);
      }

      if (updates.length > 0) {
        updates.push(`updated_at = NOW()`);
        values.push(unitId, spaceId);

        const updateQuery = `
          UPDATE space_units 
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex++} AND space_id = $${paramIndex++}
        `;

        await client.query(updateQuery, values);
      }

      // Handle images if provided
      if (images !== undefined && Array.isArray(images)) {
        // Delete existing images
        await client.query(`DELETE FROM unit_images WHERE unit_id = $1`, [unitId]);

        // Insert new images
        for (let i = 0; i < images.length; i++) {
          const isPrimary = (i === 0);
          await client.query(
            `INSERT INTO unit_images (unit_id, image_base64, display_order, is_primary, created_at)
             VALUES ($1, $2, $3, $4, NOW())`,
            [unitId, images[i], i, isPrimary]
          );
        }
      }

      await client.query('COMMIT');

      // Fetch updated unit with images
      const updatedUnit = await pool.query(
        `SELECT 
          u.id, u.name, u.unit_type, u.total_capacity,
          u.hourly_rate, u.daily_rate, u.monthly_rate,
          u.is_active, u.duration, u.created_at, u.updated_at,
          COALESCE(
            (SELECT json_agg(
              json_build_object(
                'id', ui.id,
                'image_base64', ui.image_base64,
                'display_order', ui.display_order,
                'is_primary', ui.is_primary
              ) ORDER BY ui.display_order
            ) FROM unit_images ui WHERE ui.unit_id = u.id),
            '[]'::json
          ) as images
        FROM space_units u
        WHERE u.id = $1`,
        [unitId]
      );

      const unit = updatedUnit.rows[0];
      if (unit) {
        if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
        if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
        if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
        if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);
      }

      return res.status(200).json({
        success: true,
        message: "Unit updated successfully",
        unit: unit
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error("updateUnit error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// DELETE UNIT (soft delete)
// DELETE /api/spaces/:spaceId/units/:unitId
// =============================
export const deleteUnit = async (req, res) => {
  try {
    const { spaceId, unitId } = req.params;
    const owner_id = req.user.id;

    // Verify ownership through space
    const spaceCheck = await pool.query(
      `SELECT id FROM spaces WHERE id = $1 AND owner_id = $2 AND is_active = true`,
      [spaceId, owner_id]
    );

    if (spaceCheck.rows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to delete this unit"
      });
    }

    // Soft delete the unit
    const result = await pool.query(
      `UPDATE space_units 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1 AND space_id = $2 AND is_active = true
       RETURNING id, name`,
      [unitId, spaceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found or already deleted"
      });
    }

    // Note: Images remain in unit_images table for audit purposes
    // To delete images as well, uncomment below:
    // await pool.query(`DELETE FROM unit_images WHERE unit_id = $1`, [unitId]);

    return res.status(200).json({
      success: true,
      message: `Unit "${result.rows[0].name}" deleted successfully`,
      data: result.rows[0]
    });
  } catch (error) {
    console.error("deleteUnit error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

// =============================
// GET ALL OPEN DESKS
// GET /api/spaces/unit/open_desks
// =============================

export const getOpenDesks = async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // Default 5 items per page
    const offset = (page - 1) * limit;

    // First, get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM space_units u
       JOIN spaces s ON u.space_id = s.id
       WHERE u.unit_type = 'open_desk' 
         AND u.is_active = true 
         AND s.is_active = true`
    );

    const totalCount = parseInt(countResult.rows[0].total);

    // Then get paginated data with ONLY FIRST/Primary IMAGE
    const result = await pool.query(
      `SELECT 
        u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
        u.hourly_rate, u.daily_rate, u.monthly_rate,
        u.duration, u.is_active, u.created_at, u.updated_at,
        s.name as space_name, s.city, s.address, s.is_verified,
        -- Get only the first/primary image (ordered by is_primary DESC and display_order)
        (
          SELECT json_build_object(
            'id', ui.id,
            'image_base64', ui.image_base64,
            'display_order', ui.display_order,
            'is_primary', ui.is_primary
          )
          FROM unit_images ui 
          WHERE ui.unit_id = u.id 
          ORDER BY ui.is_primary DESC, ui.display_order ASC 
          LIMIT 1
        ) as primary_image
      FROM space_units u
      JOIN spaces s ON u.space_id = s.id
      WHERE u.unit_type = 'open_desk' 
        AND u.is_active = true 
        AND s.is_active = true
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const formattedUnits = result.rows.map(unit => ({
      ...unit,
      hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
      daily_rate: parseFloat(unit.daily_rate),
      monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
      total_capacity: parseInt(unit.total_capacity),
      // Transform primary_image to match frontend expected format
      images: unit.primary_image ? [unit.primary_image] : [] // Frontend expects array
    }));

    // Remove the raw primary_image from response to avoid duplication
    const cleanedUnits = formattedUnits.map(({ primary_image, ...rest }) => rest);

    return res.status(200).json({
      success: true,
      unit_type: "open_desk",
      display_name: "Open Desks",
      total_count: totalCount,
      page: page,
      limit: limit,
      total_pages: Math.ceil(totalCount / limit),
      units: cleanedUnits
    });

  } catch (error) {
    console.error("getOpenDesks error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};
// =============================
// GET ALL DEDICATED DESKS
// GET /api/spaces/unit/dedicated_desks
// =============================
// export const getDedicatedDesks = async (req, res) => {
//   try {
//     const result = await pool.query(
//       `SELECT 
//         u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
//         u.hourly_rate, u.daily_rate, u.monthly_rate,
//         u.duration, u.is_active, u.created_at, u.updated_at,
//         s.name as space_name, s.city, s.address, s.is_verified,
//         COALESCE(
//           (SELECT json_agg(
//             json_build_object(
//               'id', ui.id,
//               'image_base64', ui.image_base64,
//               'display_order', ui.display_order,
//               'is_primary', ui.is_primary
//             ) ORDER BY ui.display_order
//           ) FROM unit_images ui WHERE ui.unit_id = u.id),
//           '[]'::json
//         ) as images
//       FROM space_units u
//       JOIN spaces s ON u.space_id = s.id
//       WHERE u.unit_type = 'dedicated_desk' AND u.is_active = true AND s.is_active = true
//       ORDER BY u.created_at DESC
//       LIMIT 50`
//     );

//     const formattedUnits = result.rows.map(unit => ({
//       id: unit.id,
//       space_id: unit.space_id,
//       unit_type: unit.unit_type,
//       name: unit.name,
//       space_name: unit.space_name,
//       city: unit.city,
//       address: unit.address,
//       total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
//       hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
//       daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : 0,
//       monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
//       images: unit.images || [],
//       duration: unit.duration,
//       is_active: unit.is_active,
//       is_verified: unit.is_verified,
//       created_at: unit.created_at,
//       updated_at: unit.updated_at
//     }));

//     return res.status(200).json({
//       success: true,
//       unit_type: "dedicated_desk",
//       display_name: "Dedicated Desks",
//       total_count: formattedUnits.length,
//       units: formattedUnits
//     });

//   } catch (error) {
//     console.error("getDedicatedDesks error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };



export const getDedicatedDesks = async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // Default 5 items per page
    const offset = (page - 1) * limit;

    // First, get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM space_units u
       JOIN spaces s ON u.space_id = s.id
       WHERE u.unit_type = 'dedicated_desk' 
         AND u.is_active = true 
         AND s.is_active = true`
    );

    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data with ONLY ONE image (primary or first)
    const result = await pool.query(
      `SELECT 
        u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
        u.hourly_rate, u.daily_rate, u.monthly_rate,
        u.duration, u.is_active, u.created_at, u.updated_at,
        s.name as space_name, s.city, s.address, s.is_verified,
        -- Get only the first/primary image
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ui.id,
                'image_base64', ui.image_base64,
                'display_order', ui.display_order,
                'is_primary', ui.is_primary
              )
            )
            FROM (
              SELECT * FROM unit_images 
              WHERE unit_id = u.id 
              ORDER BY is_primary DESC, display_order ASC 
              LIMIT 1
            ) ui
          ),
          '[]'::json
        ) as images
      FROM space_units u
      JOIN spaces s ON u.space_id = s.id
      WHERE u.unit_type = 'dedicated_desk' 
        AND u.is_active = true 
        AND s.is_active = true
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const formattedUnits = result.rows.map(unit => ({
      id: unit.id,
      space_id: unit.space_id,
      unit_type: unit.unit_type,
      name: unit.name,
      space_name: unit.space_name,
      city: unit.city,
      address: unit.address,
      total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
      hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
      daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : 0,
      monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
      images: unit.images || [], // Now contains only 1 image
      duration: unit.duration,
      is_active: unit.is_active,
      is_verified: unit.is_verified,
      created_at: unit.created_at,
      updated_at: unit.updated_at
    }));

    console.log(`📊 getDedicatedDesks: Page ${page} returning ${formattedUnits.length} of ${totalCount} units`);

    return res.status(200).json({
      success: true,
      unit_type: "dedicated_desk",
      display_name: "Dedicated Desks",
      total_count: totalCount,
      page: page,
      limit: limit,
      total_pages: Math.ceil(totalCount / limit),
      units: formattedUnits
    });

  } catch (error) {
    console.error("getDedicatedDesks error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// =============================
// GET ALL PRIVATE CABINS
// GET /api/spaces/unit/private_cabins
// =============================

export const getPrivateCabins = async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // Default 5 items per page
    const offset = (page - 1) * limit;

    // First, get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM space_units u
       JOIN spaces s ON u.space_id = s.id
       WHERE u.unit_type = 'private_cabin' 
         AND u.is_active = true 
         AND s.is_active = true`
    );

    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data with ONLY ONE image (primary or first)
    const result = await pool.query(
      `SELECT 
        u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
        u.hourly_rate, u.daily_rate, u.monthly_rate,
        u.duration, u.is_active, u.created_at, u.updated_at,
        s.name as space_name, s.city, s.address, s.is_verified,
        -- Get only the first/primary image
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ui.id,
                'image_base64', ui.image_base64,
                'display_order', ui.display_order,
                'is_primary', ui.is_primary
              )
            )
            FROM (
              SELECT * FROM unit_images 
              WHERE unit_id = u.id 
              ORDER BY is_primary DESC, display_order ASC 
              LIMIT 1
            ) ui
          ),
          '[]'::json
        ) as images
      FROM space_units u
      JOIN spaces s ON u.space_id = s.id
      WHERE u.unit_type = 'private_cabin' 
        AND u.is_active = true 
        AND s.is_active = true
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const formattedUnits = result.rows.map(unit => ({
      id: unit.id,
      space_id: unit.space_id,
      unit_type: unit.unit_type,
      name: unit.name || unit.space_name,
      space_name: unit.space_name,
      city: unit.city,
      address: unit.address,
      total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
      hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
      daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : 0,
      monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
      images: unit.images || [], // Now contains only 1 image
      duration: unit.duration,
      is_active: unit.is_active,
      is_verified: unit.is_verified,
      created_at: unit.created_at,
      updated_at: unit.updated_at
    }));

    console.log(`📊 getPrivateCabins: Page ${page} returning ${formattedUnits.length} of ${totalCount} units`);

    return res.status(200).json({
      success: true,
      unit_type: "private_cabin",
      display_name: "Private Cabins",
      total_count: totalCount,
      page: page,
      limit: limit,
      total_pages: Math.ceil(totalCount / limit),
      units: formattedUnits
    });

  } catch (error) {
    console.error("getPrivateCabins error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};



// =============================
// GET ALL MEETING ROOMS
// GET /api/spaces/unit/meeting_rooms
// =============================

export const getMeetingRooms = async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5; // Default 5 items per page
    const offset = (page - 1) * limit;

    // First, get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total 
       FROM space_units u
       JOIN spaces s ON u.space_id = s.id
       WHERE u.unit_type = 'meeting_room' 
         AND u.is_active = true 
         AND s.is_active = true`
    );

    const totalCount = parseInt(countResult.rows[0].total);

    // Get paginated data with ONLY ONE image (primary or first)
    const result = await pool.query(
      `SELECT 
        u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
        u.hourly_rate, u.daily_rate, u.monthly_rate,
        u.duration, u.is_active, u.created_at, u.updated_at,
        s.name as space_name, s.city, s.address, s.is_verified,
        -- Get only the first/primary image
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', ui.id,
                'image_base64', ui.image_base64,
                'display_order', ui.display_order,
                'is_primary', ui.is_primary
              )
            )
            FROM (
              SELECT * FROM unit_images 
              WHERE unit_id = u.id 
              ORDER BY is_primary DESC, display_order ASC 
              LIMIT 1
            ) ui
          ),
          '[]'::json
        ) as images
      FROM space_units u
      JOIN spaces s ON u.space_id = s.id
      WHERE u.unit_type = 'meeting_room' 
        AND u.is_active = true 
        AND s.is_active = true
      ORDER BY u.created_at DESC
      LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const formattedUnits = result.rows.map(unit => ({
      id: unit.id,
      space_id: unit.space_id,
      unit_type: unit.unit_type,
      name: unit.name || unit.space_name,
      space_name: unit.space_name,
      city: unit.city,
      address: unit.address,
      total_capacity: unit.total_capacity ? parseInt(unit.total_capacity) : null,
      hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
      daily_rate: unit.daily_rate ? parseFloat(unit.daily_rate) : 0,
      monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
      images: unit.images || [], // Now contains only 1 image
      duration: unit.duration,
      is_active: unit.is_active,
      is_verified: unit.is_verified,
      created_at: unit.created_at,
      updated_at: unit.updated_at
    }));

    console.log(`📊 getMeetingRooms: Page ${page} returning ${formattedUnits.length} of ${totalCount} units`);

    return res.status(200).json({
      success: true,
      unit_type: "meeting_room",
      display_name: "Meeting Rooms",
      total_count: totalCount,
      page: page,
      limit: limit,
      total_pages: Math.ceil(totalCount / limit),
      units: formattedUnits
    });

  } catch (error) {
    console.error("getMeetingRooms error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};


// =============================
// GET SINGLE UNIT DETAILS
// GET /api/spaces/unit/details/:unitId
// =============================
// export const getUnitDetails = async (req, res) => {
//   try {
//     const { unitId } = req.params;

//     const result = await pool.query(
//       `SELECT 
//         u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
//         u.hourly_rate, u.daily_rate, u.monthly_rate,
//         u.duration, u.is_active, u.created_at, u.updated_at,
//         s.name as space_name, s.description as space_description,
//         s.address, s.city, s.area, s.latitude, s.longitude,
//         s.opening_time, s.closing_time, s.working_days,
//         s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
//         s.has_parking, s.has_security, s.has_backup_power,
//         s.owner_id,  -- ← ADD THIS LINE (only change needed)
//         COALESCE(
//           (SELECT json_agg(
//             json_build_object(
//               'id', ui.id,
//               'image_base64', ui.image_base64,
//               'display_order', ui.display_order,
//               'is_primary', ui.is_primary
//             ) ORDER BY ui.display_order
//           ) FROM unit_images ui WHERE ui.unit_id = u.id),
//           '[]'::json
//         ) as images
//       FROM space_units u
//       JOIN spaces s ON u.space_id = s.id
//       WHERE u.id = $1 AND u.is_active = true AND s.is_active = true`,
//       [unitId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Unit not found"
//       });
//     }

//     const unit = result.rows[0];
//     if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
//     if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
//     if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
//     if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);

//     return res.status(200).json({
//       success: true,
//       unit: unit
//     });

//   } catch (error) {
//     console.error("getUnitDetails error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };


// export const getUnitDetails = async (req, res) => {
//   try {
//     const { unitId } = req.params;

//     const result = await pool.query(
//       `SELECT 
//         u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
//         u.hourly_rate, u.daily_rate, u.monthly_rate,
//         u.duration, u.is_active, u.created_at, u.updated_at,
//         s.name as space_name, s.description as space_description,
//         s.address, s.city, s.area, s.latitude, s.longitude,
//         s.opening_time, s.closing_time, s.working_days,
//         s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
//         s.has_parking, s.has_security, s.has_backup_power,
//         s.owner_id,
//         s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
//         s.is_verified,
//         COALESCE(
//           (SELECT json_agg(
//             json_build_object(
//               'id', ui.id,
//               'image_base64', ui.image_base64,
//               'display_order', ui.display_order,
//               'is_primary', ui.is_primary
//             ) ORDER BY ui.display_order
//           ) FROM unit_images ui WHERE ui.unit_id = u.id),
//           '[]'::json
//         ) as images
//       FROM space_units u
//       JOIN spaces s ON u.space_id = s.id
//       WHERE u.id = $1 AND u.is_active = true AND s.is_active = true`,
//       [unitId]
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Unit not found"
//       });
//     }

//     const row = result.rows[0];

//     // Parse numeric values
//     if (row.hourly_rate) row.hourly_rate = parseFloat(row.hourly_rate);
//     if (row.daily_rate) row.daily_rate = parseFloat(row.daily_rate);
//     if (row.monthly_rate) row.monthly_rate = parseFloat(row.monthly_rate);
//     if (row.total_capacity) row.total_capacity = parseInt(row.total_capacity);

//     // Build response with BOTH flattened AND nested structure
//     const response = {
//       success: true,
//       unit: {
//         // Flattened fields (for backward compatibility with your new code)
//         id: row.id,
//         space_id: row.space_id,
//         unit_type: row.unit_type,
//         name: row.name,
//         total_capacity: row.total_capacity,
//         hourly_rate: row.hourly_rate,
//         daily_rate: row.daily_rate,
//         monthly_rate: row.monthly_rate,
//         duration: row.duration,
//         is_active: row.is_active,
//         created_at: row.created_at,
//         updated_at: row.updated_at,

//         // Flattened space fields
//         space_name: row.space_name,
//         space_description: row.space_description,
//         address: row.address,
//         city: row.city,
//         area: row.area,
//         latitude: row.latitude,
//         longitude: row.longitude,
//         opening_time: row.opening_time,
//         closing_time: row.closing_time,
//         working_days: row.working_days,
//         has_wifi: row.has_wifi,
//         has_ac: row.has_ac,
//         has_coffee: row.has_coffee,
//         has_printer: row.has_printer,
//         has_parking: row.has_parking,
//         has_security: row.has_security,
//         has_backup_power: row.has_backup_power,
//         owner_id: row.owner_id,

//         // Images
//         images: row.images,

//         // ===== NESTED OBJECTS (for old code compatibility) =====
//         // Nested space object (what your old code expects)
//         space: {
//           id: row.space_id,
//           name: row.space_name,
//           description: row.space_description,
//           city: row.city,
//           area: row.area,
//           address: row.address,
//           latitude: row.latitude,
//           longitude: row.longitude,
//           opening_time: row.opening_time,
//           closing_time: row.closing_time,
//           working_days: row.working_days,
//           has_wifi: row.has_wifi,
//           has_ac: row.has_ac,
//           has_coffee: row.has_coffee,
//           has_printer: row.has_printer,
//           has_parking: row.has_parking,
//           has_security: row.has_security,
//           has_backup_power: row.has_backup_power,
//           is_verified: row.is_verified,
//           owner_id: row.owner_id,
//           cancellation_policy: row.cancellation_policy,
//           refund_policy: row.refund_policy,
//           late_arrival_policy: row.late_arrival_policy
//         },

//         // Nested amenities object (for old code)
//         space_amenities: {
//           wifi: row.has_wifi,
//           ac: row.has_ac,
//           coffee: row.has_coffee,
//           printer: row.has_printer,
//           parking: row.has_parking,
//           security: row.has_security,
//           backup_power: row.has_backup_power
//         },

//         // Nested policies object (for old code)
//         policies: {
//           cancellation: row.cancellation_policy,
//           refund: row.refund_policy,
//           late_arrival: row.late_arrival_policy
//         },

//         // Display name mapping
//         display_name: (() => {
//           switch (row.unit_type) {
//             case 'open_desk': return 'Open Desk';
//             case 'dedicated_desk': return 'Dedicated Desk';
//             case 'private_cabin': return 'Private Cabin';
//             case 'meeting_room': return 'Meeting Room';
//             default: return row.unit_type;
//           }
//         })()
//       }
//     };

//     return res.status(200).json(response);

//   } catch (error) {
//     console.error("getUnitDetails error:", error.message);
//     return res.status(500).json({
//       success: false,
//       message: "Server error",
//       error: error.message
//     });
//   }
// };



// Update your backend - Split images into separate endpoint
export const getUnitDetails = async (req, res) => {
  try {
    const { unitId } = req.params;

    // Query WITHOUT images (faster response)
    const result = await pool.query(
      `SELECT 
        u.id, u.space_id, u.unit_type, u.name, u.total_capacity,
        u.hourly_rate, u.daily_rate, u.monthly_rate,
        u.duration, u.is_active, u.created_at, u.updated_at,
        s.name as space_name, s.description as space_description,
        s.address, s.city, s.area, s.latitude, s.longitude,
        s.opening_time, s.closing_time, s.working_days,
        s.has_wifi, s.has_ac, s.has_coffee, s.has_printer,
        s.has_parking, s.has_security, s.has_backup_power,
        s.owner_id,
        s.cancellation_policy, s.refund_policy, s.late_arrival_policy,
        s.is_verified
        -- REMOVED images from main query
      FROM space_units u
      JOIN spaces s ON u.space_id = s.id
      WHERE u.id = $1 AND u.is_active = true AND s.is_active = true`,
      [unitId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found"
      });
    }

    const row = result.rows[0];

    // Parse numeric values
    if (row.hourly_rate) row.hourly_rate = parseFloat(row.hourly_rate);
    if (row.daily_rate) row.daily_rate = parseFloat(row.daily_rate);
    if (row.monthly_rate) row.monthly_rate = parseFloat(row.monthly_rate);
    if (row.total_capacity) row.total_capacity = parseInt(row.total_capacity);

    const response = {
      success: true,
      unit: {
        // All your existing fields except images
        id: row.id,
        space_id: row.space_id,
        unit_type: row.unit_type,
        name: row.name,
        total_capacity: row.total_capacity,
        hourly_rate: row.hourly_rate,
        daily_rate: row.daily_rate,
        monthly_rate: row.monthly_rate,
        duration: row.duration,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        space_name: row.space_name,
        space_description: row.space_description,
        address: row.address,
        city: row.city,
        area: row.area,
        latitude: row.latitude,
        longitude: row.longitude,
        opening_time: row.opening_time,
        closing_time: row.closing_time,
        working_days: row.working_days,
        has_wifi: row.has_wifi,
        has_ac: row.has_ac,
        has_coffee: row.has_coffee,
        has_printer: row.has_printer,
        has_parking: row.has_parking,
        has_security: row.has_security,
        has_backup_power: row.has_backup_power,
        owner_id: row.owner_id,

        // Nested objects (same as before)
        space: {
          id: row.space_id,
          name: row.space_name,
          description: row.space_description,
          city: row.city,
          area: row.area,
          address: row.address,
          latitude: row.latitude,
          longitude: row.longitude,
          opening_time: row.opening_time,
          closing_time: row.closing_time,
          working_days: row.working_days,
          has_wifi: row.has_wifi,
          has_ac: row.has_ac,
          has_coffee: row.has_coffee,
          has_printer: row.has_printer,
          has_parking: row.has_parking,
          has_security: row.has_security,
          has_backup_power: row.has_backup_power,
          is_verified: row.is_verified,
          owner_id: row.owner_id,
          cancellation_policy: row.cancellation_policy,
          refund_policy: row.refund_policy,
          late_arrival_policy: row.late_arrival_policy
        },
        space_amenities: {
          wifi: row.has_wifi,
          ac: row.has_ac,
          coffee: row.has_coffee,
          printer: row.has_printer,
          parking: row.has_parking,
          security: row.has_security,
          backup_power: row.has_backup_power
        },
        policies: {
          cancellation: row.cancellation_policy,
          refund: row.refund_policy,
          late_arrival: row.late_arrival_policy
        },
        display_name: (() => {
          switch (row.unit_type) {
            case 'open_desk': return 'Open Desk';
            case 'dedicated_desk': return 'Dedicated Desk';
            case 'private_cabin': return 'Private Cabin';
            case 'meeting_room': return 'Meeting Room';
            default: return row.unit_type;
          }
        })()
      }
    };

    return res.status(200).json(response);

  } catch (error) {
    console.error("getUnitDetails error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};

/**
 * GET /api/bookings/unit/:unitId/calendar-dates
 * Get ONLY the dates for calendar display (minimal data for faster response)
 * This controller is specifically for the calendar view
 */
export const getCalendarDates = async (req, res) => {
  try {
    const { unitId } = req.params;

    // Validate unit exists
    const unitCheck = await pool.query(
      `SELECT id, name FROM space_units 
       WHERE id = $1 AND is_active = true`,
      [unitId]
    );

    if (unitCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Unit not found or inactive"
      });
    }

    // Get all confirmed and pending bookings for this unit
    const result = await pool.query(
      `SELECT 
        id,
        start_time,
        end_time,
        status,
        booking_ref
      FROM bookings
      WHERE space_unit_id = $1
        AND status IN ('confirmed', 'pending')
        AND start_time >= CURRENT_DATE
      ORDER BY start_time ASC`,
      [unitId]
    );

    // Extract just the dates
    const bookings = result.rows;
    const bookedDates = [];
    const fullDayBookings = [];
    const timeSlotBookings = [];

    bookings.forEach(booking => {
      const startDate = new Date(booking.start_time);
      const endDate = new Date(booking.end_time);

      // ✅ FIX: Generate all dates between start and end
      const dateKeys = [];
      const currentDate = new Date(startDate);

      // Loop through each day from start to end
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        dateKeys.push(dateKey);
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Calculate duration in hours
      const durationHours = (endDate - startDate) / (1000 * 60 * 60);
      const isFullDay = durationHours >= 24;

      // For each date in the range, mark as booked
      dateKeys.forEach(dateKey => {
        // For full-day bookings, mark the entire date
        if (isFullDay) {
          fullDayBookings.push({
            date: dateKey,
            bookingRef: booking.booking_ref,
            status: booking.status
          });
        } else {
          // For time-slot bookings, store the time range for the start date only
          if (dateKey === startDate.toISOString().split('T')[0]) {
            timeSlotBookings.push({
              date: dateKey,
              startTime: booking.start_time,
              endTime: booking.end_time,
              bookingRef: booking.booking_ref,
              status: booking.status
            });
          }
        }

        // Add to booked dates if not already present
        if (!bookedDates.includes(dateKey)) {
          bookedDates.push(dateKey);
        }
      });
    });

    // Generate available dates for the next 6 months
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const sixMonthsLater = new Date(today);
    sixMonthsLater.setMonth(sixMonthsLater.getMonth() + 6);

    const availableDates = [];
    const currentDate = new Date(today);

    while (currentDate <= sixMonthsLater) {
      const dateStr = currentDate.toISOString().split('T')[0];
      if (!bookedDates.includes(dateStr)) {
        availableDates.push(dateStr);
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Simple response - only what the calendar needs
    return res.status(200).json({
      success: true,
      data: {
        unitId: unitId,
        unitName: unitCheck.rows[0].name,
        bookedDates: bookedDates,        // ✅ Now includes ALL dates in range
        availableDates: availableDates,
        details: {
          fullDayBookings: fullDayBookings,
          timeSlotBookings: timeSlotBookings,
          totalBookings: bookings.length
        }
      }
    });

  } catch (error) {
    console.error("getCalendarDates error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// NEW ENDPOINT: Get images separately
export const getUnitImages = async (req, res) => {
  try {
    const { unitId } = req.params;

    const result = await pool.query(
      `SELECT 
        id, image_base64, display_order, is_primary
      FROM unit_images 
      WHERE unit_id = $1 
      ORDER BY display_order ASC`,
      [unitId]
    );

    const images = result.rows.map(row => ({
      id: row.id,
      image_base64: row.image_base64,
      display_order: row.display_order,
      is_primary: row.is_primary
    }));

    return res.status(200).json({
      success: true,
      images: images
    });

  } catch (error) {
    console.error("getUnitImages error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to load images",
      error: error.message
    });
  }
};