from django.urls import path
from .views import LoginView, LogoutView

urlpatterns = [
    path("Login/", LoginView.as_view(), name="Login"),
    path("logout/", LogoutView.as_view(), name="logout"),
]
