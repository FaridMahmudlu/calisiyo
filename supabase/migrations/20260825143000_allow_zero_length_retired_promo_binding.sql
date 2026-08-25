alter table public.content_producer_code_bindings
  drop constraint if exists content_producer_code_bindings_period_valid;

alter table public.content_producer_code_bindings
  add constraint content_producer_code_bindings_period_valid
  check (valid_to is null or valid_to >= valid_from);
