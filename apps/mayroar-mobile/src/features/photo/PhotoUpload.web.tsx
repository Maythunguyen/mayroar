import { Image } from "react-native";
import { Button, Field, Message } from "../../components/ui";

type Props = {
  photo: string;
  notes: string;
  disabled: boolean;
  analysing: boolean;
  onChoose: (file?: File) => void;
  onNotesChange: (value: string) => void;
  onAnalyse: () => void;
};

export function PhotoUpload(props: Props) {
  return <>
    <Message>Analysis sends the selected image to OpenAI. Photos are not saved in your diary.</Message>
    <input aria-label="Choose food photo" type="file" accept="image/jpeg,image/png,image/webp"
      disabled={props.disabled} onChange={event => {
        props.onChoose(event.target.files?.[0]); event.target.value = "";
      }} />
    {props.photo ? <Image source={{ uri: props.photo }} resizeMode="contain"
      style={{ width: "100%", height: 240, borderRadius: 18 }} /> : null}
    <Field label="Portion or ingredients you know (optional)" value={props.notes}
      placeholder="For example: 150 g cooked rice, 1 tbsp oil" maxLength={500}
      editable={!props.disabled} onChangeText={props.onNotesChange} />
    <Button busy={props.analysing} disabled={props.disabled || !props.photo} onPress={props.onAnalyse}>
      Analyse photo
    </Button>
  </>;
}
