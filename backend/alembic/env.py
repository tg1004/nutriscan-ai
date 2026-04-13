import sys
import os
from logging.config import fileConfig

from sqlalchemy import engine_from_config
from sqlalchemy import pool

from alembic import context

# Add the app directory to Python path so imports work
sys.path.insert(0, '/app')

# Import settings and all models so Alembic can detect them
from app.core.config import settings
from app.core.database import Base

# Import every model — Alembic needs to see them to generate migrations
from app.models.user import User
from app.models.profile import UserProfile
from app.models.meal_log import MealLog, LogItem
from app.models.food_item import (
    FoodItem,
    NutritionFact,
    Ingredient,
    FoodIngredient,
    OilProfile,
    BarcodeProduct,
)

# Alembic Config object
config = context.config

# Set the database URL from your .env (overrides alembic.ini)
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# This is what tells Alembic which tables to create
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()