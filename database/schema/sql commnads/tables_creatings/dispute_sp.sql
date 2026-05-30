CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    raised_by UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'open', -- open, under_review, resolved, rejected
    resolution TEXT,
    resolved_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);