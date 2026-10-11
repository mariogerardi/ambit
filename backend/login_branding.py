"""Cognito managed login styling, using Ambit's existing globe and wordmark."""
import base64
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]


def page_background():
    # Keep the globe as vector artwork; no external URLs or WebGL on login.
    globe = (ROOT / "public/brand/account-globe.svg").read_text()
    globe = globe.replace('<svg ', '<svg x="760" y="60" width="1280" height="1280" opacity=".18" ', 1)
    image = '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080" viewBox="0 0 1920 1080"><rect width="1920" height="1080" fill="#071321" />' + globe + '</svg>'
    ET.fromstring(image)
    return image.encode()


def branding():
    def modes(values):
        return {"darkMode": values, "lightMode": values}

    settings = {
        "categories": {
            "global": {"colorSchemeMode": "DARK", "spacingDensity": "REGULAR", "pageHeader": {"enabled": True}, "pageFooter": {"enabled": False}},
            "form": {"location": {"horizontal": "CENTER", "vertical": "CENTER"}},
        },
        "componentClasses": {
            "buttons": {"borderRadius": 12},
            "divider": modes({"borderColor": "304551ff"}),
            "focusState": modes({"borderColor": "9cd8deff"}),
            "input": {"borderRadius": 10, **modes({"defaults": {"backgroundColor": "0b1825ff", "borderColor": "587080ff"}, "placeholderColor": "a5c6d2ff"})},
            "inputLabel": modes({"textColor": "edf4f7ff"}),
            "inputDescription": modes({"textColor": "a5c6d2ff"}),
            "link": modes({"defaults": {"textColor": "9cd8deff"}, "hover": {"textColor": "c5eef1ff"}}),
            "optionControls": modes({"defaults": {"backgroundColor": "0b1825ff", "borderColor": "587080ff"}, "selected": {"backgroundColor": "9cd8deff", "foregroundColor": "122c3aff"}}),
        },
        "components": {
            "pageBackground": {"image": {"enabled": True}, **modes({"color": "071321ff"})},
            "pageHeader": {"backgroundImage": {"enabled": False}, "logo": {"enabled": True, "location": "START"}, **modes({"background": {"color": "071321ff"}, "borderColor": "07132100"})},
            "form": {"borderRadius": 20, "backgroundImage": {"enabled": False}, "logo": {"enabled": False}, **modes({"backgroundColor": "071321ff", "borderColor": "07132100"})},
            "pageText": modes({"bodyColor": "edf4f7ff", "descriptionColor": "a5c6d2ff", "headingColor": "edf4f7ff"}),
            "primaryButton": modes({"defaults": {"backgroundColor": "efbb91ff", "textColor": "122c3aff"}, "hover": {"backgroundColor": "f5caa7ff", "textColor": "122c3aff"}, "active": {"backgroundColor": "e4ab7aff", "textColor": "122c3aff"}, "disabled": {"backgroundColor": "304551ff", "borderColor": "304551ff"}}),
            "secondaryButton": modes({"defaults": {"backgroundColor": "0b1825ff", "borderColor": "587080ff", "textColor": "edf4f7ff"}, "hover": {"backgroundColor": "16222dff", "borderColor": "9cd8deff", "textColor": "edf4f7ff"}, "active": {"backgroundColor": "16222dff", "borderColor": "9cd8deff", "textColor": "edf4f7ff"}}),
        },
    }
    assets = [
        {"Category": "PAGE_BACKGROUND", "ColorMode": "DARK", "Extension": "SVG", "Bytes": base64.b64encode(page_background()).decode()},
        {"Category": "PAGE_HEADER_LOGO", "ColorMode": "DARK", "Extension": "PNG", "Bytes": base64.b64encode((ROOT / "deployment/cognito/ambit-logo.png").read_bytes()).decode()},
    ]
    return {"UseCognitoProvidedValues": False, "Settings": settings, "Assets": assets}
