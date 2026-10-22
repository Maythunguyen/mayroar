import * as ImagePicker from "expo-image-picker";
import { Alert, Image } from "react-native";
import { Button, Field, Message } from "../../components/ui";
import type { PickedPhoto } from "./model";

type Props = {
  disabled: boolean;
  analysing: boolean;
  photo?: string;
  notes: string;
  onChoose: (photo?: PickedPhoto) => void;
  onNotesChange: (value: string) => void;
  onAnalyse: () => void;
};

const options: ImagePicker.ImagePickerOptions = {
  mediaTypes: ["images"],
  quality: 0.7,
  base64: true,        // new: gives readPhoto the data without extra file APIs
  exif: false,
};

export function PhotoUpload(props: Props) {
  const handle = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      const a = result.assets[0];
      props.onChoose({ uri: a.uri, base64: a.base64 ?? undefined, mimeType: a.mimeType, fileName: a.fileName ?? undefined });
    }
  };

    const takePhoto = async () => {
    try {
        const { granted } = await ImagePicker.requestCameraPermissionsAsync();
        if (!granted) return Alert.alert("Camera access needed", "Enable camera access in Settings.");
        handle(await ImagePicker.launchCameraAsync(options));
    } catch (e) {
        Alert.alert("Camera error", e instanceof Error ? e.message : String(e));
    }
    };

    const pickFromLibrary = async () => {
    try {
        handle(await ImagePicker.launchImageLibraryAsync(options));
    } catch (e) {
        Alert.alert("Library error", e instanceof Error ? e.message : String(e));
    }
    };

  return (
    <>
      <Message>Analysis sends the selected image to OpenAI. Photos are not saved in your diary.</Message>
      <Button disabled={props.disabled} onPress={takePhoto}>Take photo</Button>
      <Button disabled={props.disabled} onPress={pickFromLibrary}>Choose from library</Button>
      {props.photo ? (
        <Image source={{ uri: props.photo }} resizeMode="contain"
          style={{ width: "100%", height: 240, borderRadius: 18 }} />
      ) : null}
      <Field label="Portion or ingredients you know (optional)" value={props.notes}
        placeholder="For example: 150 g cooked rice, 1 tbsp oil" maxLength={500}
        editable={!props.disabled} onChangeText={props.onNotesChange} />
      <Button busy={props.analysing} disabled={props.disabled || !props.photo} onPress={props.onAnalyse}>
        Analyse photo
      </Button>
    </>
  );
}