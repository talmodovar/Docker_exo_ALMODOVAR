from .auth import router as auth_router
from .tweet import router as tweet_router

# Liste des routers
routers = [auth_router, tweet_router]