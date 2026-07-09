import { useParams } from "react-router-dom";
import GoalNav from "./components/GoalNav";
import GoalNodeWorkspace from "./components/GoalNodeWorkspace";

export default function BusinessGoalNodesPage() {
  const { id = "" } = useParams();

  return (
    <div style={{ display: "grid", gap: 18 }}>
      <GoalNav />
      {id && <GoalNodeWorkspace goalId={id} />}
    </div>
  );
}
