-- Create subscriptions table
CREATE TABLE subscriptions (
    id uuid default uuid_generate_v4() primary key,
    user_email varchar not null,
    bag_id uuid references bags(id),
    active boolean default true,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Create index for faster lookups
CREATE INDEX idx_subscriptions_user_email ON subscriptions(user_email);
CREATE INDEX idx_subscriptions_bag_id ON subscriptions(bag_id);

-- Add trigger for updated_at
CREATE TRIGGER update_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column(); 