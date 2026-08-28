from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import MetaData, text
from app.core.config import settings
from app.core.tenant import ESQUEMA_PLATAFORMA, esquema_actual

NAMING_CONVENTION = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s",
}

metadata = MetaData(naming_convention=NAMING_CONVENTION)

engine = create_async_engine(
    settings.DATABASE_URL,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    metadata = metadata


async def get_db() -> AsyncSession:
    """Sesión ya apuntando al esquema del cliente en curso.

    El `search_path` se fija acá y no en cada consulta: es lo que hace que los
    módulos no tengan que filtrar por cliente y que no puedan equivocarse.
    """
    async with AsyncSessionLocal() as session:
        try:
            # Siempre se fija, incluso para el esquema por defecto: `SET
            # search_path` sobrevive a la petición y las conexiones se reciclan
            # entre clientes, así que omitirlo dejaba a una petición heredando el
            # esquema de la anterior — es decir, viendo datos de otro cliente.
            # Solo su esquema: con public detrás, una tabla que falte en el
            # cliente se resolvería contra la de otro.
            esquema = esquema_actual() or ESQUEMA_PLATAFORMA
            # search_path no acepta parámetros, hay que interpolar; por eso el
            # código del cliente se valida al crearlo y al resolverlo.
            await session.execute(text(f'SET search_path TO "{esquema}"'))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def get_db_plataforma() -> AsyncSession:
    """Sesión contra el registro de clientes, sin inquilino.

    La usa el paso previo al login, cuando todavía no se sabe a qué cliente se
    entra.
    """
    async with AsyncSessionLocal() as session:
        try:
            # También acá se fija: la conexión puede venir del pool con el
            # esquema de otro cliente todavía puesto.
            await session.execute(text(f'SET search_path TO "{ESQUEMA_PLATAFORMA}"'))
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
