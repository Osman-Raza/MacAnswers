"""
One class per McMaster source page.
Add new sources here — just extend BaseScraper and register in run_all.py.
"""
from .base import BaseScraper, clean_html
from bs4 import BeautifulSoup


class TuitionScraper(BaseScraper):
    source_name = "Tuition & Fees"
    source_url = "https://registrar.mcmaster.ca/tuition-fees/"

    def parse(self, html: str) -> str:
        return clean_html(html)


class SnowDayScraper(BaseScraper):
    source_name = "Snow Day Alerts"
    source_url = "https://www.mcmaster.ca/emergency/snow.html"

    def parse(self, html: str) -> str:
        return clean_html(html)


class CourseSelectionScraper(BaseScraper):
    source_name = "Course Selection & Registration"
    source_url = "https://registrar.mcmaster.ca/build-degree/mytimetable/"

    def parse(self, html: str) -> str:
        return clean_html(html)


class OSAPScraper(BaseScraper):
    source_name = "OSAP & Financial Aid"
    source_url = "https://registrar.mcmaster.ca/aid-awards/osap-government-aid/"

    def parse(self, html: str) -> str:
        return clean_html(html)


class HousingDeadlinesScraper(BaseScraper):
    source_name = "Housing & Residence Deadlines"
    source_url = "https://housing.mcmaster.ca/apply/"

    def parse(self, html: str) -> str:
        return clean_html(html)


class DentalPlanScraper(BaseScraper):
    source_name = "Dental & Health Plan"
    source_url = "https://msumcmaster.ca/services/dental-health-plan/"

    def parse(self, html: str) -> str:
        return clean_html(html)


class AcademicCalendarScraper(BaseScraper):
    source_name = "Academic Calendar Key Dates"
    source_url = "https://registrar.mcmaster.ca/dates/"

    def parse(self, html: str) -> str:
        return clean_html(html)
    



class AnnouncementsScraper(BaseScraper):
    """Scrapes the main McMaster news/announcements feed — runs hourly."""
    source_name = "McMaster Announcements"
    source_url = "https://dailynews.mcmaster.ca/"

    def parse(self, html: str) -> str:
        soup = BeautifulSoup(html, "html.parser")
        # Pull headlines and summaries from article cards
        articles = soup.select("article")
        lines = []
        for a in articles[:20]:   # latest 20 items
            title = a.find(["h2", "h3"])
            summary = a.find("p")
            link = a.find("a", href=True)
            if title:
                lines.append(title.get_text(strip=True))
            if summary:
                lines.append(summary.get_text(strip=True))
            if link and link["href"].startswith("http"):
                lines.append(f"Read more: {link['href']}")
            lines.append("")
        return "\n".join(lines)

'''
class RateMyProfScraper(BaseScraper):
    """
    RateMyProfessors does not have a public API.
    This scraper fetches a pre-generated JSON export of McMaster professor
    ratings (community-maintained, updated semesterly).
    Replace source_url with your own data source or a custom export.
    """
    source_name = "RateMyProfessor Ratings"
    source_url = "https://raw.githubusercontent.com/your-org/mac-rmp-export/main/mcmaster.json"

    def parse(self, html: str) -> str:
        # html here is actually JSON text
        import json
        try:
            profs = json.loads(html)
            lines = []
            for p in profs:
                lines.append(
                    f"Professor {p['name']} ({p['department']}): "
                    f"Rating {p['rating']}/5, Difficulty {p['difficulty']}/5. "
                    f"{p.get('num_ratings', 0)} ratings."
                )
            return "\n".join(lines)
        except Exception:
            return ""
'''