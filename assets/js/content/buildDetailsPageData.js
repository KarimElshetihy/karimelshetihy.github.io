import { getPortfolioProjectsFromPage } from "../portfolio/projectUtils.js";
import { isLinkableProject, isLinkableTopic } from "./contentAvailability.js";
import { getExploreSection } from "./exploreUtils.js";
import { sortByOrder } from "./sortByOrder.js";

const PORTFOLIO_DETAILS_DEFAULTS = {
  title: "Portfolio Details",
  subtitle: "Project highlights and implementation overview.",
  infoTitle: "Project information"
};

const EXPLORE_DETAILS_DEFAULTS = {
  title: "Explore Topic",
  subtitle: "In-depth notes and learning paths.",
  infoTitle: "Topic information"
};

export function buildPortfolioDetailsPageData(portfolioPage) {
  const portfolioSection = (portfolioPage?.sections ?? []).find(
    (section) => section.type === "portfolioDynamic"
  );
  const projects = getPortfolioProjectsFromPage(portfolioPage).filter(isLinkableProject);

  return {
    meta: portfolioPage?.meta ?? { title: "", description: "" },
    sections: [
      {
        type: "portfolioDetailsData",
        data: {
          ...PORTFOLIO_DETAILS_DEFAULTS,
          subtitle: portfolioSection?.data?.subtitle ?? PORTFOLIO_DETAILS_DEFAULTS.subtitle,
          projects
        }
      }
    ]
  };
}

export function buildExploreDetailsPageData(explorePage) {
  const exploreSection = getExploreSection(explorePage);
  const topics = sortByOrder((exploreSection?.data?.topics ?? []).filter(isLinkableTopic));

  return {
    meta: explorePage?.meta ?? { title: "", description: "" },
    sections: [
      {
        type: "exploreDetailsData",
        data: {
          ...EXPLORE_DETAILS_DEFAULTS,
          subtitle: exploreSection?.data?.subtitle ?? EXPLORE_DETAILS_DEFAULTS.subtitle,
          topics
        }
      }
    ]
  };
}
