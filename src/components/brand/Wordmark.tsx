import WordmarkSvg from '../../../assets/design/word mark text.svg';

type Props = {
  width: number;
  height: number;
};

export function Wordmark({ width, height }: Props) {
  return <WordmarkSvg width={width} height={height} />;
}
