CREATE TABLE projects (
    name TEXT PRIMARY KEY,
    client TEXT,
    autonomous_community TEXT,
    size_of_construction NUMERIC,
    construction_type TEXT,
    number_of_floors INTEGER,
    ground_quality_study TEXT,
    end_state TEXT
);

CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    project_name TEXT,
    folder_type TEXT,
    file_name TEXT,
    FOREIGN KEY (project_name) REFERENCES projects(name)
);

CREATE TABLE elements (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER,
    name TEXT,
    unit TEXT,
    quantity NUMERIC,
    price_per_unit NUMERIC,
    discount NUMERIC,
    total_price NUMERIC,
    chapter_code TEXT,
    chapter_title TEXT,
    subchapter_code TEXT,
    subchapter_title TEXT,
    element_code TEXT,
    description TEXT,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id)
);

CREATE TABLE subelements (
    id SERIAL PRIMARY KEY,
    element_id INTEGER,
    title TEXT,
    unit TEXT,
    n NUMERIC,
    l NUMERIC,
    h NUMERIC,
    w NUMERIC,
    unit_price NUMERIC,
    total_price NUMERIC,
    FOREIGN KEY (element_id) REFERENCES elements(id)
);
