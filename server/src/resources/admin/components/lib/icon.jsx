/**
 * Icon module exporting a number of svg icons
 *
 * @module app/lib/icon
 * @author Darryl Cousins <darryljcousins@gmail.com>
 */
import { createElement } from "@b9g/crank";

/**
 * Icon component, not intended to be used alone but rather as parent element to a path.
 *
 * @returns {Element} DOM component as `svg` wrapper
 * @param {object} props  Component properties
 * @param {Element} props.children Nested child path for display
 */
const Icon = ({ children, styleSize }) => {
  styleSize = styleSize ? styleSize : '1.8em';
  const size = 20;
  return (
    <svg
      width={`${size}px`}
      height={`${size}px`}
      class="dib"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${size + 3} ${size + 5}`}
      fillRule="evenodd"
      clipRule="evenodd"
      strokeLinejoin="round"
      strokeMiterlimit="1.414"
      style={`width: ${styleSize}; height: ${styleSize}; margin: 0`}
    >
      {children}
    </svg>
  );
};

/**
 * DragIcon component, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const DragIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0V0z" fill="none"/><path d="M11 18c0 1.1-.9 2-2 2s-2-.9-2-2 .9-2 2-2 2 .9 2 2zm-2-8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm6 4c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
  </Icon>
);

/**
 * SearchIcon component, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const SearchIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
  </Icon>
);

/**
 * ClearSearchIcon component, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const ClearSearchIcon = () => (
  <Icon>
    <g><g><path d="M15.5,14h-0.79l-0.28-0.27C15.41,12.59,16,11.11,16,9.5C16,5.91,13.09,3,9.5,3C6.08,3,3.28,5.64,3.03,9h2.02 C5.3,6.75,7.18,5,9.5,5C11.99,5,14,7.01,14,9.5S11.99,14,9.5,14c-0.17,0-0.33-0.03-0.5-0.05v2.02C9.17,15.99,9.33,16,9.5,16 c1.61,0,3.09-0.59,4.23-1.57L14,14.71v0.79l5,4.99L20.49,19L15.5,14z"/><polygon points="6.47,10.82 4,13.29 1.53,10.82 0.82,11.53 3.29,14 0.82,16.47 1.53,17.18 4,14.71 6.47,17.18 7.18,16.47 4.71,14 7.18,11.53"/></g></g>
  </Icon>
);

/**
 * SyncIcon component, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const SyncIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
  </Icon>
);

/**
 * ToggleOnIcon component, excel symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const ToggleOnIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zm0 8c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
  </Icon>
);

/**
 * ToggleOffIcon component, excel symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const ToggleOffIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M17 7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h10c2.76 0 5-2.24 5-5s-2.24-5-5-5zM7 15c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/>
  </Icon>
);

/**
 * CopyIcon (ContentCopy) component, excel symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const CopyIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
  </Icon>
);

/**
 * ExcelIcon component, excel symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const ExcelIcon = () => (
  <Icon>
    <path d="M23 1.5q.41 0 .7.3.3.29.3.7v19q0 .41-.3.7-.29.3-.7.3H7q-.41 0-.7-.3-.3-.29-.3-.7V18H1q-.41 0-.7-.3-.3-.29-.3-.7V7q0-.41.3-.7Q.58 6 1 6h5V2.5q0-.41.3-.7.29-.3.7-.3zM6 13.28l1.42 2.66h2.14l-2.38-3.87 2.34-3.8H7.46l-1.3 2.4-.05.08-.04.09-.64-1.28-.66-1.29H2.59l2.27 3.82-2.48 3.85h2.16zM14.25 21v-3H7.5v3zm0-4.5v-3.75H12v3.75zm0-5.25V7.5H12v3.75zm0-5.25V3H7.5v3zm8.25 15v-3h-6.75v3zm0-4.5v-3.75h-6.75v3.75zm0-5.25V7.5h-6.75v3.75zm0-5.25V3h-6.75v3Z" />
  </Icon>
);

/**
 * DownloadIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const DownloadIcon = () => (
  <Icon>
    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
  </Icon>
);

/**
 * SaveAltIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const SaveAltIcon = () => (
  <Icon>
    <path d="M19 12v7H5v-7H3v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7h-2zm-6 .67l2.59-2.58L17 11.5l-5 5-5-5 1.41-1.41L11 12.67V3h2z" />
  </Icon>
);

/**
 * CloseIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const CloseIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M14.59 8L12 10.59 9.41 8 8 9.41 10.59 12 8 14.59 9.41 16 12 13.41 14.59 16 16 14.59 13.41 12 16 9.41 14.59 8zM12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
  </Icon>
);

/**
 * AddIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const AddIcon = () => (
  // Material icon set
  <Icon>
    <path d="M13 11h-2v3H8v2h3v3h2v-3h3v-2h-3zm1-9H6c-1.1 0-2 .9-2 2v16c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11z" />
  </Icon>
);

/**
 * HelpIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const HelpIcon = () => (
  <Icon>
    <path d="M11 18h2v-2h-2v2zm1-16C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-14c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z" />
  </Icon>
);

/**
 * EditIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const EditIcon = () => (
  <Icon>
    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
  </Icon>
);

/**
 * DeleteIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const DeleteIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
  </Icon>
);

/**
 * FilterIcon component, download symbol, path borrowed from
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const FilterIcon = () => (
  <Icon>
    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z"/>
  </Icon>
);

/**
 * MenuIcon component, the 'burger' icon
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const MenuIcon = ({styleSize}) => {
  styleSize = styleSize ? styleSize : '3.0rem';
  return (
    <Icon styleSize={styleSize}>
      <path d="M0 0h24v24H0z" fill="none"/><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/>
    </Icon>
  );
};

/**
 * CaretUpIcon component
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const CaretUpIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M7 14l5-5 5 5z"/>
  </Icon>
);

/**
 * CaretDownIcon component
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const CaretDownIcon = () => (
  <Icon>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M7 10l5 5 5-5z"/>
  </Icon>
);

/**
 * AlertIcon component
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const AlertIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M0 0h24v24H0z" fill="none"/><circle cx="12" cy="19" r="2"/><path d="M10 3h4v12h-4z"/>
  </Icon>
);

/**
 * ClockIcon component
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const ClockIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/><path d="M12.5 7H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
  </Icon>
);

/**
 * CheckAltIcon component
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const CheckAltIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M22,5.18L10.59,16.6l-4.24-4.24l1.41-1.41l2.83,2.83l10-10L22,5.18z M19.79,10.22C19.92,10.79,20,11.39,20,12 c0,4.42-3.58,8-8,8s-8-3.58-8-8c0-4.42,3.58-8,8-8c1.58,0,3.04,0.46,4.28,1.25l1.44-1.44C16.1,2.67,14.13,2,12,2C6.48,2,2,6.48,2,12 c0,5.52,4.48,10,10,10s10-4.48,10-10c0-1.19-0.22-2.33-0.6-3.39L19.79,10.22z"/>
  </Icon>
);

/**
 * ErrorOutlineIcon component
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const ErrorOutlineIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M0 0h24v24H0V0z" fill="none"/><path d="M11 15h2v2h-2zm0-8h2v6h-2zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z"/>
  </Icon>
);

/**
 * CheckBoxOffIcon component (CheckboxOutline)
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const CheckBoxOffIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
  </Icon>
);

/**
 * CheckBoxOnIcon component (CheckboxBlack)
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const CheckBoxOnIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M0 0h24v24H0z" fill="none"/><path d="M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </Icon>
);

/**
 * PreviewIcon component (PreviewBlack)
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const PreviewIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M19,3H5C3.89,3,3,3.9,3,5v14c0,1.1,0.89,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.11,3,19,3z M19,19H5V7h14V19z M13.5,13 c0,0.83-0.67,1.5-1.5,1.5s-1.5-0.67-1.5-1.5c0-0.83,0.67-1.5,1.5-1.5S13.5,12.17,13.5,13z M12,9c-2.73,0-5.06,1.66-6,4 c0.94,2.34,3.27,4,6,4s5.06-1.66,6-4C17.06,10.66,14.73,9,12,9z M12,15.5c-1.38,0-2.5-1.12-2.5-2.5c0-1.38,1.12-2.5,2.5-2.5 c1.38,0,2.5,1.12,2.5,2.5C14.5,14.38,13.38,15.5,12,15.5z"/>
  </Icon>
);

/**
 * SettingsIcon component
 * {@link https://material.io/icons/|Material Design}. Intended to be wrapped by
 * {@link module:app/lib/icon~Icon|Icon}
 *
 * @returns {Element} DOM component
 */
const SettingsIcon = ({styleSize}) => (
  <Icon styleSize={styleSize}>
    <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
  </Icon>
);

export {
  AlertIcon,
  CheckAltIcon,
  ClockIcon,
  CloseIcon,
  CopyIcon,
  DeleteIcon,
  DownloadIcon,
  ErrorOutlineIcon,
  EditIcon,
  AddIcon,
  ExcelIcon,
  HelpIcon,
  SaveAltIcon,
  FilterIcon,
  MenuIcon,
  CaretUpIcon,
  CaretDownIcon,
  ToggleOnIcon,
  ToggleOffIcon,
  CheckBoxOffIcon,
  CheckBoxOnIcon,
  PreviewIcon,
  SettingsIcon,
  SearchIcon,
  ClearSearchIcon,
  SyncIcon,
  DragIcon,
};
