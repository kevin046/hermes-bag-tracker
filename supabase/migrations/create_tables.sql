-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Bags table
create table bags (
    id uuid default uuid_generate_v4() primary key,
    sku varchar not null unique,
    bag_name varchar not null,  -- e.g., 'picotin18', 'lindy26'
    name varchar,              -- Full product name
    price decimal(10,2),       -- Current price
    color varchar,
    material varchar,
    size varchar,              -- e.g., '18', '26', 'mini'
    model_line varchar,        -- e.g., 'Picotin', 'Lindy'
    availability boolean,
    url text,                  -- Product URL
    description text,
    images text[],            -- Array of image URLs
    last_checked timestamp with time zone default now(),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Price history table
create table price_history (
    id uuid default uuid_generate_v4() primary key,
    bag_id uuid references bags(id),
    price decimal(10,2),
    availability boolean,
    checked_at timestamp with time zone default now()
);

-- Stock history table
create table stock_history (
    id uuid default uuid_generate_v4() primary key,
    bag_id uuid references bags(id),
    availability boolean,
    color varchar,
    checked_at timestamp with time zone default now()
);

-- Create indexes for better query performance
create index idx_bags_sku on bags(sku);
create index idx_bags_bag_name on bags(bag_name);
create index idx_bags_availability on bags(availability);
create index idx_price_history_bag_id on price_history(bag_id);
create index idx_stock_history_bag_id on stock_history(bag_id);

-- Create updated_at trigger
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_bags_updated_at
    before update on bags
    for each row
    execute procedure update_updated_at_column();

-- Create views for easy querying
create view latest_bag_status as
select 
    b.id,
    b.sku,
    b.bag_name,
    b.name,
    b.price,
    b.color,
    b.material,
    b.size,
    b.model_line,
    b.availability,
    b.last_checked,
    ph.price as last_price,
    ph.checked_at as price_checked_at
from bags b
left join lateral (
    select price, checked_at
    from price_history
    where bag_id = b.id
    order by checked_at desc
    limit 1
) ph on true;

-- Function to track price changes
create or replace function track_price_change()
returns trigger as $$
begin
    if (TG_OP = 'UPDATE') then
        if (NEW.price != OLD.price) then
            insert into price_history (bag_id, price, availability)
            values (NEW.id, NEW.price, NEW.availability);
        end if;
    elsif (TG_OP = 'INSERT') then
        insert into price_history (bag_id, price, availability)
        values (NEW.id, NEW.price, NEW.availability);
    end if;
    return NEW;
end;
$$ language plpgsql;

create trigger track_bag_price_changes
    after insert or update on bags
    for each row
    execute procedure track_price_change();

-- Function to track stock changes
create or replace function track_stock_change()
returns trigger as $$
begin
    if (TG_OP = 'UPDATE') then
        if (NEW.availability != OLD.availability or NEW.color != OLD.color) then
            insert into stock_history (bag_id, availability, color)
            values (NEW.id, NEW.availability, NEW.color);
        end if;
    elsif (TG_OP = 'INSERT') then
        insert into stock_history (bag_id, availability, color)
        values (NEW.id, NEW.availability, NEW.color);
    end if;
    return NEW;
end;
$$ language plpgsql;

create trigger track_bag_stock_changes
    after insert or update on bags
    for each row
    execute procedure track_stock_change();
 