-- decision_number_seq sequence'i için izinleri ver
GRANT USAGE, SELECT ON SEQUENCE decision_number_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE decision_number_seq TO service_role;
GRANT USAGE, SELECT ON SEQUENCE decision_number_seq TO anon;

-- Gelecekteki sequence'ler için varsayılan izinler (Opsiyonel ama iyi bir pratik)
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon;

-- Schema cache'i yenile
NOTIFY pgrst, 'reload schema';
