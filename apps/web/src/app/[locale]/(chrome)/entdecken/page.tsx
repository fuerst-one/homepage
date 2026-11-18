import {
  ExplorePage,
  exploreMetadata,
  type ExplorePageProps,
} from "../../../../components/ExperienceAtlas/ExplorePage";
export const revalidate = 60;
export const generateMetadata = exploreMetadata;
export default function Page(props: ExplorePageProps) {
  return <ExplorePage {...props} routeLocale="de" />;
}
