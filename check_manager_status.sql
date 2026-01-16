-- Check status for Sarah Jenkins (Manager)
-- ID: d0c2c1e8-76a0-4c4f-9e79-5e7b57855680

SELECT * FROM time_entries 
WHERE user_id = 'd0c2c1e8-76a0-4c4f-9e79-5e7b57855680' 
ORDER BY clock_in DESC;
