import { pool } from "../config/db.config.js";

// =============================
// CREATE SPACE (owner lists a new space)
// POST /api/spaces
// =============================
// =============================
// CREATE SPACE - Using Stored Procedure
// =============================
// =============================
// CREATE SPACE - With One Space Per User Restriction
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
// ADD UNIT TO SPACE (owner adds open_desk, meeting_room etc.)
// POST /api/spaces/:spaceId/units
// =============================
// =============================
// ADD SPACE UNIT - Using Stored Procedure
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
      images,
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

    // Handle Base64 images - Convert to JSONB array
    let imagesJsonb = [];
    if (images) {
      if (Array.isArray(images)) {
        // If already an array of Base64 strings
        imagesJsonb = images;
      } else if (typeof images === 'string') {
        try {
          // Try to parse as JSON array string
          const parsed = JSON.parse(images);
          if (Array.isArray(parsed)) {
            imagesJsonb = parsed;
          } else {
            imagesJsonb = [images];
          }
        } catch (e) {
          // If not JSON, treat as single Base64 string
          imagesJsonb = [images];
        }
      }
    }

    // Optional: Log warning for large Base64 strings
    if (imagesJsonb.length > 0) {
      const totalSize = imagesJsonb.reduce((sum, img) => sum + (img?.length || 0), 0);
      const avgSize = totalSize / imagesJsonb.length;
      if (avgSize > 500000) { // 500KB warning
        console.warn(`Large Base64 images detected (avg ${Math.round(avgSize / 1024)}KB). Consider optimizing.`);
      }
    }

    // Clean and parse numeric values
    const cleanTotalCapacity = total_capacity ? parseInt(total_capacity) : null;
    const cleanHourlyRate = hourly_rate ? parseFloat(hourly_rate) : null;
    const cleanDailyRate = daily_rate ? parseFloat(daily_rate) : null;
    const cleanMonthlyRate = monthly_rate ? parseFloat(monthly_rate) : null;

    // Call SP with JSONB parameter for images
    const result = await pool.query(
      `SELECT sp_add_space_unit(
        $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11
      ) as response`,
      [
        spaceId,                                    // $1: p_space_id
        owner_id,                                   // $2: p_owner_id
        unit_type,                                  // $3: p_unit_type
        name || null,                               // $4: p_name
        cleanTotalCapacity,                         // $5: p_total_capacity
        cleanHourlyRate,                            // $6: p_hourly_rate
        cleanDailyRate,                             // $7: p_daily_rate
        cleanMonthlyRate,                           // $8: p_monthly_rate
        JSON.stringify(imagesJsonb),                // $9: p_images (JSONB array of Base64)
        duration || null,                           // $10: p_duration
        is_active !== undefined ? is_active : true  // $11: p_is_active
      ]
    );

    const response = result.rows[0]?.response;

    if (!response || !response.success) {
      const statusCode = response?.message?.includes('already exists') ? 409 :
        response?.message?.includes('not found') ? 403 : 400;
      return res.status(statusCode).json({
        success: false,
        message: response?.message || "Failed to add unit"
      });
    }

    // Format the response data
    const unit = response.unit;
    if (unit) {
      // Convert string rates to numbers
      if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
      if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
      if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
      if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);

      // Images remain as JSONB/Base64 - no conversion needed
      // They will be returned as array of Base64 strings
    }

    return res.status(201).json({
      success: true,
      message: response.message,
      unit: unit
    });

  } catch (error) {
    console.error("addSpaceUnit error:", error.message);
    return res.status(500).json({
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
// =============================
// GET ALL SPACES - Using Stored Procedure
// =============================
export const getAllSpaces = async (req, res) => {
  try {
    const { city, type } = req.query;

    // Call the stored procedure with parameters (null = no filter)
    const result = await pool.query(
      `SELECT * FROM sp_get_all_spaces($1, $2)`,
      [city || null, type || null]
    );

    return res.status(200).json({
      success: true,
      count: result.rows.length,
      spaces: result.rows,
    });
  } catch (error) {
    console.error("getAllSpaces error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};

// =============================
// GET SINGLE SPACE (public - space detail page)
// GET /api/spaces/:id
// =============================
// =============================
// GET SPACE BY ID - Using JSON SP
// =============================
export const getSpaceById = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT sp_get_space_by_id($1) as space_data`,
      [id]
    );

    const space = result.rows[0]?.space_data;

    if (!space || !space.id) {
      return res.status(404).json({
        success: false,
        message: "Space not found",
      });
    }

    return res.status(200).json({
      success: true,
      space: space,
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
// =============================

export const getMySpaces = async (req, res) => {
  try {
    const owner_id = req.user.id;

    // Get spaces
    const spacesResult = await pool.query(
      `SELECT sp_get_my_spaces($1::UUID) as spaces`,
      [owner_id]
    );

    let spaces = spacesResult.rows[0]?.spaces || [];
    if (typeof spaces === 'string') {
      spaces = JSON.parse(spaces);
    }

    // Get units for each space separately
    for (let space of spaces) {
      const unitsResult = await pool.query(
        `SELECT json_agg(
            json_build_object(
                'id', u.id,
                'unit_type', u.unit_type,
                'name', u.name,
                'total_capacity', u.total_capacity,
                'hourly_rate', u.hourly_rate,
                'daily_rate', u.daily_rate,
                'monthly_rate', u.monthly_rate,
                'images', u.images,
                'duration', u.duration,
                'is_active', u.is_active
            ) ORDER BY u.created_at ASC
        ) as units
        FROM space_units u
        WHERE u.space_id = $1::UUID AND u.is_active = true`,
        [space.id]
      );

      space.units = unitsResult.rows[0]?.units || [];
    }

    return res.status(200).json({
      success: true,
      count: spaces.length,
      spaces: spaces
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
// =============================
// UPDATE SPACE - Using JSON SP
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
      cover_image, gallery_images,
      cancellation_policy, refund_policy, late_arrival_policy,
    } = req.body;

    // ✅ FIX: Use $22 (not $23) - 22 parameters total
    const result = await pool.query(
      `SELECT sp_update_space($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22) as response`,
      [
        id,                           // 1
        owner_id,                     // 2
        name || null,                 // 3
        description || null,          // 4
        address || null,              // 5
        city || null,                 // 6
        area || null,                 // 7
        opening_time || null,         // 8
        closing_time || null,         // 9
        working_days || null,         // 10
        has_wifi ?? false,            // 11
        has_ac ?? false,              // 12
        has_coffee ?? false,          // 13
        has_printer ?? false,         // 14
        has_parking ?? false,         // 15
        has_security ?? false,        // 16
        has_backup_power ?? false,    // 17
        cover_image || null,          // 18
        gallery_images || null,       // 19
        cancellation_policy || null,  // 20
        refund_policy || null,        // 21
        late_arrival_policy || null   // 22
      ]
    );

    const response = result.rows[0]?.response;

    if (!response.success) {
      return res.status(403).json({
        success: false,
        message: response.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: response.message,
      space: response.space,
    });
  } catch (error) {
    console.error("updateSpace error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};
// =============================
// DELETE SPACE (soft delete - owner)
// DELETE /api/spaces/:id
// =============================
// =============================
// DELETE SPACE - Using JSON SP
// =============================
export const deleteSpace = async (req, res) => {
  try {
    const { id } = req.params;
    const owner_id = req.user.id;

    const result = await pool.query(
      `SELECT sp_delete_space($1, $2) as result`,
      [id, owner_id]
    );

    const response = result.rows[0]?.result;

    if (!response.success) {
      return res.status(403).json({
        success: false,
        message: response.message,
      });
    }

    return res.status(200).json({
      success: true,
      message: response.message,
    });
  } catch (error) {
    console.error("deleteSpace error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
};



// GET ALL UNITS OF SPACE - Using JSON SP
// =============================
export const getAllUnitsOfSpace = async (req, res) => {
  try {
    const { spaceId } = req.params;

    const result = await pool.query(
      `SELECT sp_get_space_units($1) as data`,
      [spaceId]
    );

    const response = result.rows[0]?.data;

    if (!response || response.success === false) {
      return res.status(404).json({
        success: false,
        message: response?.message || "Space not found",
      });
    }

    return res.status(200).json({
      success: true,
      count: response.count,
      space: response.space,
      units: response.units,
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
// GET SINGLE UNIT BY ID (public)
// GET /api/spaces/:spaceId/units/:unitId
// =============================
// =============================
// GET UNIT BY ID - Using JSON SP
// =============================
export const getUnitById = async (req, res) => {
  try {
    const { spaceId, unitId } = req.params;

    const result = await pool.query(
      `SELECT sp_get_unit_by_id($1, $2) as unit_data`,
      [unitId, spaceId]
    );

    const unit = result.rows[0]?.unit_data;

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found in this space",
      });
    }

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
// UPDATE UNIT - Using Stored Procedures
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

    // Check if any fields were provided for update
    const hasAnyUpdate = [
      name, unit_type, total_capacity,
      hourly_rate, daily_rate, monthly_rate,
      images, duration, is_active
    ].some(field => field !== undefined && field !== null);

    // If no fields to update, just fetch the unit
    if (!hasAnyUpdate) {
      const getUnit = await pool.query(
        `SELECT row_to_json(space_units.*) as unit FROM space_units 
         WHERE id = $1::uuid AND space_id = $2::uuid`,
        [unitId, spaceId]
      );

      if (getUnit.rows.length === 0) {
        return res.status(404).json({ success: false, message: "Unit not found" });
      }

      const unit = getUnit.rows[0].unit;
      if (unit) {
        if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
        if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
        if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
        if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);
      }

      return res.status(200).json({
        success: true,
        message: "No fields to update",
        unit: unit
      });
    }

    // Handle images conversion
    let imagesArray = null;
    if (images !== undefined && images !== null) {
      if (Array.isArray(images)) {
        imagesArray = images;
      } else if (typeof images === 'string') {
        try {
          imagesArray = JSON.parse(images);
        } catch (e) {
          imagesArray = [images];
        }
      }
    }

    // Clean and parse numeric values
    const cleanHourly = hourly_rate !== undefined && hourly_rate !== null ? parseFloat(hourly_rate) : null;
    const cleanDaily = daily_rate !== undefined && daily_rate !== null ? parseFloat(daily_rate) : null;
    const cleanMonthly = monthly_rate !== undefined && monthly_rate !== null ? parseFloat(monthly_rate) : null;
    const cleanTotalCapacity = total_capacity !== undefined && total_capacity !== null ? parseInt(total_capacity) : null;

    // Single call to sp_update_unit with all 12 parameters - CAST TO UUID
    const updateResult = await pool.query(
      `SELECT sp_update_unit(
        $1::uuid, $2::uuid, $3::uuid, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) as response`,
      [
        unitId,                                    // $1: p_unit_id (cast to uuid)
        spaceId,                                   // $2: p_space_id (cast to uuid)
        owner_id,                                  // $3: p_owner_id (cast to uuid)
        name !== undefined ? name : null,          // $4: p_name
        unit_type !== undefined ? unit_type : null, // $5: p_unit_type
        cleanTotalCapacity,                        // $6: p_total_capacity
        cleanHourly,                               // $7: p_hourly_rate
        cleanDaily,                                // $8: p_daily_rate
        cleanMonthly,                              // $9: p_monthly_rate
        imagesArray,                               // $10: p_images (text[])
        duration !== undefined ? duration : null,  // $11: p_duration
        is_active !== undefined ? is_active : null // $12: p_is_active
      ]
    );

    const result = updateResult.rows[0]?.response;

    // Check if the SP returned an error
    if (!result || !result.success) {
      return res.status(400).json({
        success: false,
        message: result?.message || "Update failed"
      });
    }

    // Format response
    const unit = result.unit;
    if (unit) {
      if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
      if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
      if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
      if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);
    }

    return res.status(200).json({
      success: true,
      message: result.message,
      unit: unit
    });

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
// DELETE UNIT - Using Single SP
// =============================
export const deleteUnit = async (req, res) => {
  try {
    const { spaceId, unitId } = req.params;
    const owner_id = req.user.id;

    const result = await pool.query(
      `SELECT sp_delete_unit($1, $2, $3) as response`,
      [unitId, spaceId, owner_id]
    );

    const response = result.rows[0]?.response;

    if (!response.success) {
      const statusCode = response.message.includes('not found') ? 404 :
        response.message.includes('already deleted') ? 400 : 403;
      return res.status(statusCode).json({
        success: false,
        message: response.message
      });
    }

    return res.status(200).json({
      success: true,
      message: response.message,
      data: response.data
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
// =============================
export const getOpenDesks = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sp_get_units_by_type($1, $2)`,
      ['open_desk', 50]
    );
    // Format the response to return numbers instead of strings
    const formattedUnits = result.rows.map(unit => ({
      ...unit,
      hourly_rate: unit.hourly_rate ? parseFloat(unit.hourly_rate) : null,
      daily_rate: parseFloat(unit.daily_rate),
      monthly_rate: unit.monthly_rate ? parseFloat(unit.monthly_rate) : null,
      total_capacity: parseInt(unit.total_capacity)
    }));

    return res.status(200).json({
      success: true,
      unit_type: "open_desk",
      display_name: "Open Desks",
      total_count: formattedUnits.length,
      units: formattedUnits
    });

  } catch (error) {
    console.error("getOpenDesks error:", error.message);
    console.error("Full error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};



// =============================
// GET ALL DEDICATED DESKS - Using SP
// =============================
export const getDedicatedDesks = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sp_get_units_by_type($1, $2)`,
      ['dedicated_desk', 50]
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
      images: unit.images || [],
      duration: unit.duration,
      is_active: unit.is_active,
      is_verified: unit.is_verified,
      created_at: unit.created_at,
      updated_at: unit.updated_at
    }));

    return res.status(200).json({
      success: true,
      unit_type: "dedicated_desk",
      display_name: "Dedicated Desks",
      total_count: formattedUnits.length,
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
// =============================
export const getPrivateCabins = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sp_get_units_by_type($1, $2)`,
      ['private_cabin', 50]
    );
    // Format the response to return numbers instead of strings
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
      images: unit.images || [],
      duration: unit.duration,
      is_active: unit.is_active,
      is_verified: unit.is_verified,
      created_at: unit.created_at,
      updated_at: unit.updated_at
    }));

    return res.status(200).json({
      success: true,
      unit_type: "private_cabin",
      display_name: "Private Cabins",
      total_count: formattedUnits.length,
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
// =============================
export const getMeetingRooms = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM sp_get_units_by_type($1, $2)`,
      ['meeting_room', 50]
    );

    // Format the response to return numbers instead of strings
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
      images: unit.images || [],
      duration: unit.duration,
      is_active: unit.is_active,
      is_verified: unit.is_verified,
      created_at: unit.created_at,
      updated_at: unit.updated_at
    }));

    return res.status(200).json({
      success: true,
      unit_type: "meeting_room",
      display_name: "Meeting Rooms",
      total_count: formattedUnits.length,
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
// GET SINGLE UNIT DETAILS - Using Stored Procedure
// =============================
export const getUnitDetails = async (req, res) => {
  try {
    const { unitId } = req.params;

    // Call stored procedure
    const result = await pool.query(
      `SELECT sp_get_unit_details($1) as unit_data`,
      [unitId]
    );

    const unit = result.rows[0]?.unit_data;

    // Check if unit exists
    if (!unit) {
      return res.status(404).json({
        success: false,
        message: "Unit not found"
      });
    }

    // Format rates to numbers (if needed, SP should return proper types)
    if (unit.hourly_rate) unit.hourly_rate = parseFloat(unit.hourly_rate);
    if (unit.daily_rate) unit.daily_rate = parseFloat(unit.daily_rate);
    if (unit.monthly_rate) unit.monthly_rate = parseFloat(unit.monthly_rate);
    if (unit.total_capacity) unit.total_capacity = parseInt(unit.total_capacity);

    return res.status(200).json({
      success: true,
      unit: unit
    });

  } catch (error) {
    console.error("getUnitDetails error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
};