import { DEFAULT_CONFIG } from '../config/config';
import { nodeLabelInk } from './labelRenderer';

describe('nodeLabelInk', () => {
  // GIVEN the default config, where node text is not bold
  const config = DEFAULT_CONFIG;

  it('WHEN inking the root label THEN it is bold', () => {
    expect(nodeLabelInk(config, true).bold).toBe(true);
  });

  it('WHEN inking the root label THEN it uses the root text color', () => {
    expect(nodeLabelInk(config, true).fill).toBe(config.theme.color.root.text);
  });

  it('WHEN inking a non-root label THEN it follows the node text config', () => {
    expect(nodeLabelInk(config, false).bold).toBe(config.text.node.bold);
  });
});
