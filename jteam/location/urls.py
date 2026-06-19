from django.urls import path
from . import views

app_name = "location"

urlpatterns = [
    path("", views.place_list, name="list"),
    path("list/<slug:city_slug>/", views.place_list, name="place_list_by_city"),
    path("place_detail/<int:id>/<slug:slug>/", views.place_detail, name="place_detail"),
    path("api/cities/", views.api_cities, name="api_cities"),
    path("api/suggest/", views.api_suggest, name="api_suggest"),
    path("api/geocode/", views.api_geocode, name="api_geocode"),
    path("api/detect-city/", views.api_detect_city, name="api_detect_city"),
    path("api/set-city/", views.api_set_city, name="api_set_city"),
]
