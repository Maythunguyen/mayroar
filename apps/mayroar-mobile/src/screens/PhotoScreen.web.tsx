import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useDatabase } from "../data/session";
import { localDay, readMeal, validDay } from "../domain/nutrition";
import { Header, MealPicker, Message, Page } from "../components/ui";
import { PhotoUpload } from "../features/photo/PhotoUpload.web";
import { EstimateForm } from "../features/photo/EstimateForm";
import { usePhotoAnalysis } from "../features/photo/usePhotoAnalysis.web";

export default function PhotoScreen() {
  const db = useDatabase();
  const params = useLocalSearchParams<{ date?: string; meal?: string }>();
  const day = validDay(params.date) ? params.date : localDay();
  const flow = usePhotoAnalysis(db, day, readMeal(params.meal));

  async function save() {
    if (await flow.save()) router.dismissTo({ pathname: "/", params: { date: day } });
  }

  return <Page>
    <Header title="Nutrition from photo" />
    <View pointerEvents={flow.busy ? "none" : "auto"}>
      <MealPicker value={flow.meal} onChange={meal => { if (!flow.busy) flow.setMeal(meal); }} />
    </View>
    <PhotoUpload photo={flow.photo} notes={flow.notes} disabled={flow.busy}
      analysing={flow.status === "analysing"} onChoose={file => { void flow.choose(file); }}
      onNotesChange={flow.updateNotes} onAnalyse={() => { void flow.analyse(); }} />
    {flow.status === "reading" ? <Message>Reading photo…</Message> : null}
    {flow.error ? <Message error>{flow.error}</Message> : null}
    {flow.draft ? <EstimateForm draft={flow.draft} meal={flow.meal} disabled={flow.busy}
      saving={flow.status === "saving"} onChange={flow.setDraft} onSave={() => void save()} /> : null}
  </Page>;
}
