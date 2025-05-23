const NearToken = ({ height, width }) => (
  <svg
    width={width ?? 30}
    height={height ?? 30}
    viewBox="0 0 32 33"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="1"
      y="1.5"
      width="30"
      height="30"
      rx="15"
      stroke="var(--icon-color)"
      stroke-width="2"
    />
    <path
      d="M20.8341 9.31248L17.4906 14.2778C17.4364 14.3495 17.4113 14.439 17.4204 14.5284C17.4296 14.6178 17.4722 14.7004 17.5397 14.7597C17.6072 14.8189 17.6947 14.8504 17.7844 14.8477C17.8742 14.8451 17.9596 14.8085 18.0235 14.7454L21.3138 11.9009C21.3328 11.8835 21.3564 11.8721 21.3818 11.868C21.4072 11.8639 21.4333 11.8674 21.4568 11.878C21.4802 11.8886 21.5 11.9058 21.5138 11.9276C21.5275 11.9494 21.5346 11.9747 21.5341 12.0005V20.9409C21.5338 20.968 21.5253 20.9945 21.5096 21.0166C21.4939 21.0388 21.4719 21.0556 21.4464 21.0649C21.4209 21.0742 21.3932 21.0754 21.3669 21.0685C21.3407 21.0616 21.3172 21.0469 21.2996 21.0262L11.3507 9.11514C11.1918 8.92392 10.9931 8.76978 10.7685 8.66352C10.5438 8.55726 10.2987 8.50146 10.0502 8.50003H9.70375C9.25189 8.50003 8.81853 8.67965 8.49902 8.99938C8.1795 9.31911 8 9.75276 8 10.2049V22.7951C8 23.2473 8.1795 23.6809 8.49902 24.0007C8.81853 24.3204 9.25189 24.5 9.70375 24.5C9.9949 24.5 10.2812 24.4253 10.5353 24.283C10.7894 24.1408 11.0028 23.9358 11.1552 23.6876L14.4988 18.7222C14.553 18.6506 14.578 18.561 14.5689 18.4716C14.5598 18.3822 14.5172 18.2996 14.4496 18.2404C14.3821 18.1811 14.2947 18.1497 14.2049 18.1523C14.1151 18.155 14.0297 18.1916 13.9658 18.2547L10.6755 21.0991C10.6566 21.1165 10.6329 21.128 10.6075 21.1321C10.5821 21.1361 10.556 21.1327 10.5326 21.1221C10.5091 21.1115 10.4893 21.0942 10.4755 21.0724C10.4618 21.0506 10.4547 21.0253 10.4553 20.9996V12.068C10.4555 12.0409 10.4641 12.0145 10.4797 11.9923C10.4954 11.9702 10.5175 11.9533 10.543 11.944C10.5684 11.9348 10.5962 11.9335 10.6224 11.9404C10.6486 11.9473 10.6721 11.9621 10.6898 11.9827L20.6387 23.8938C20.7987 24.0833 20.9982 24.2355 21.2231 24.3399C21.448 24.4443 21.693 24.4984 21.9409 24.4982H22.2962C22.52 24.4982 22.7415 24.4541 22.9482 24.3684C23.155 24.2828 23.3428 24.1572 23.501 23.9989C23.6592 23.8406 23.7847 23.6526 23.8703 23.4458C23.9559 23.2389 24 23.0172 24 22.7933V10.2049C24 9.98013 23.9556 9.75756 23.8693 9.55001C23.783 9.34247 23.6566 9.15405 23.4972 8.9956C23.3379 8.83714 23.1488 8.71178 22.9409 8.62674C22.7329 8.54169 22.5102 8.49863 22.2856 8.50003C21.9944 8.50007 21.7082 8.57476 21.4541 8.71699C21.2 8.85922 20.9865 9.06424 20.8341 9.31248Z"
      fill="var(--icon-color)"
    />
  </svg>
);

const StakeIcon = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15.8333 9.1665H4.16667C3.24619 9.1665 2.5 9.9127 2.5 10.8332V16.6665C2.5 17.587 3.24619 18.3332 4.16667 18.3332H15.8333C16.7538 18.3332 17.5 17.587 17.5 16.6665V10.8332C17.5 9.9127 16.7538 9.1665 15.8333 9.1665Z"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M5.83325 9.1665V5.83317C5.83325 4.7281 6.27224 3.66829 7.05364 2.88689C7.83504 2.10549 8.89485 1.6665 9.99992 1.6665C11.105 1.6665 12.1648 2.10549 12.9462 2.88689C13.7276 3.66829 14.1666 4.7281 14.1666 5.83317V9.1665"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const UnstakeIcon = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M15.8333 9.1665H4.16667C3.24619 9.1665 2.5 9.9127 2.5 10.8332V16.6665C2.5 17.587 3.24619 18.3332 4.16667 18.3332H15.8333C16.7538 18.3332 17.5 17.587 17.5 16.6665V10.8332C17.5 9.9127 16.7538 9.1665 15.8333 9.1665Z"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M5.83325 9.16679V5.83346C5.83222 4.80017 6.21515 3.80335 6.90773 3.03652C7.60031 2.26968 8.55311 1.78755 9.58117 1.6837C10.6092 1.57986 11.6392 1.86171 12.4711 2.47456C13.3031 3.0874 13.8776 3.9875 14.0833 5.00013"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const WithdrawIcon = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M2.5 7.5L2.5 4.16667C2.5 3.72464 2.6756 3.30072 2.98816 2.98816C3.30072 2.6756 3.72464 2.5 4.16667 2.5L15.8333 2.5C16.2754 2.5 16.6993 2.67559 17.0118 2.98816C17.3244 3.30072 17.5 3.72464 17.5 4.16667L17.5 7.5"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M5.83341 13.3335L10.0001 17.5002L14.1667 13.3335"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M10 17.5L10 7.5"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const AccountLocker = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="3.33337"
      y="2.5"
      width="15"
      height="15"
      rx="2.5"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      cx="10.8334"
      cy="10"
      r="2.5"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M12.9166 7.9165L14.5118 6.32133"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M12.8453 11.6665L14.5115 13.3331"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M7.5 13.3335L8.75 12.0835"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M7.5 6.32178L9.09526 7.91703"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M1.66663 6.6665H2.49996"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M1.66663 13.3335H2.49996"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const Whitelist = ({ height, width }) => (
  <svg
    width={width ?? 12}
    height={height ?? 9}
    viewBox="0 0 12 9"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M11.3333 1L4 8.33333L0.666672 5"
      stroke="var(--icon-color)"
      stroke-width="1.33333"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const VerifiedTick = ({ height, width }) => (
  <svg
    width={width ?? 22}
    height={height ?? 22}
    viewBox="0 0 22 22"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16.5879 5.32409L16.5872 5.32426L16.0542 4.03729L16.0541 4.0371C15.7665 3.34304 15.215 2.79162 14.5209 2.50411C13.8271 2.21673 13.0476 2.21654 12.3537 2.50355C12.3534 2.50368 12.353 2.50381 12.3527 2.50395L11.066 3.03463L11.0633 3.03573C11.0226 3.05263 10.9769 3.0527 10.9361 3.03594L9.64994 2.5032C8.95569 2.21563 8.17564 2.21563 7.4814 2.5032C6.78715 2.79076 6.23557 3.34234 5.94801 4.03658L5.41514 5.32304C5.39813 5.36358 5.36578 5.39576 5.32514 5.41257L5.32437 5.41289L4.0378 5.9458C4.03767 5.94585 4.03754 5.94591 4.03741 5.94596C3.69362 6.0883 3.38124 6.29695 3.11809 6.56002C2.85484 6.82318 2.64602 7.13564 2.50358 7.47954C2.36113 7.82343 2.28784 8.19203 2.2879 8.56426C2.28796 8.93615 2.36123 9.30439 2.50353 9.64798C2.50366 9.64829 2.50379 9.6486 2.50392 9.64891L3.03555 10.9361L3.03639 10.9381C3.05329 10.9788 3.05336 11.0246 3.0366 11.0653L2.50386 12.3515L2.50352 12.3523C2.21654 13.0465 2.21693 13.8261 2.5046 14.52L3.6827 14.0315L2.5046 14.52C2.79227 15.2138 3.34369 15.7651 4.03763 16.0525L5.32443 16.5855C5.36524 16.6025 5.39765 16.6349 5.41454 16.6758L5.41485 16.6765L5.94847 17.9648L5.94879 17.9656C6.23655 18.6591 6.78782 19.21 7.4815 19.4973C8.17519 19.7847 8.95456 19.7849 9.64841 19.498L9.64856 19.4979L10.9364 18.9652L10.9378 18.9647C10.9786 18.9477 11.0245 18.9477 11.0654 18.9646L12.3512 19.4972C13.0455 19.7848 13.8255 19.7848 14.5198 19.4972L14.0095 18.2654L14.5198 19.4972C15.214 19.2096 15.7656 18.6581 16.0532 17.9638L16.5862 16.677C16.6031 16.6362 16.6356 16.6038 16.6764 16.5869L16.6772 16.5866L17.9638 16.0537C17.9639 16.0536 17.964 16.0536 17.9641 16.0535C18.3079 15.9112 18.6203 15.7025 18.8835 15.4395C19.1467 15.1763 19.3555 14.8638 19.498 14.5199C19.6404 14.176 19.7137 13.8074 19.7137 13.4352C19.7136 13.0633 19.6403 12.6951 19.4981 12.3516C19.498 12.3515 19.498 12.3514 19.4979 12.3513C19.4978 12.3511 19.4977 12.3508 19.4976 12.3506L18.9659 11.065L18.9647 11.0622C18.9485 11.0231 18.948 10.9778 18.9652 10.9362L19.4982 9.64927C19.7858 8.95503 19.7858 8.17498 19.4982 7.48074C19.2107 6.78649 18.6591 6.23491 17.9649 5.94735L16.6778 5.41422C16.6371 5.39724 16.6048 5.36484 16.5879 5.32409Z"
      fill="#3CB179"
      stroke="var(--bg-page-color)"
      stroke-width="2.66667"
    />
    <path
      fill-rule="evenodd"
      clip-rule="evenodd"
      d="M14.1333 8.90291C14.2401 8.73503 14.276 8.53157 14.2328 8.33728C14.1897 8.14299 14.0711 7.9738 13.9033 7.86691C13.7354 7.76003 13.5319 7.72422 13.3376 7.76735C13.1433 7.81048 12.9741 7.92903 12.8673 8.09691L9.93026 12.7119L8.58626 11.0319C8.46201 10.8765 8.2811 10.7768 8.08335 10.7548C7.88559 10.7327 7.68718 10.7902 7.53176 10.9144C7.37634 11.0387 7.27665 11.2196 7.25462 11.4173C7.23258 11.6151 7.29001 11.8135 7.41426 11.9689L9.41426 14.4689C9.4888 14.5622 9.58453 14.6363 9.6935 14.6852C9.80246 14.734 9.92151 14.7561 10.0407 14.7497C10.16 14.7432 10.2759 14.7084 10.379 14.6481C10.4821 14.5877 10.5692 14.5037 10.6333 14.4029L14.1333 8.90291Z"
      fill="white"
    />
  </svg>
);

const NotVerfiedTick = ({ height, width }) => (
  <svg
    width={width ?? 22}
    height={height ?? 22}
    viewBox="0 0 20 19"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8.14537 13.7082H5.15492L8.19204 8.43378V9.99965C8.19204 10.4362 8.34992 10.8565 8.63407 11.1842C8.39089 11.3954 8.19899 11.6608 8.07485 11.9605C7.9171 12.3413 7.87583 12.7604 7.95625 13.1647C7.99406 13.3548 8.05797 13.5376 8.14537 13.7082ZM10.0003 5.98461C9.8551 5.98461 9.71165 6.00208 9.57281 6.03587L10.0003 5.29345L10.4277 6.03583C10.2889 6.00207 10.1455 5.98461 10.0003 5.98461ZM11.8086 9.99965V8.43426L14.8452 13.7082H11.8553C12.0054 13.4152 12.0845 13.0896 12.0845 12.7581C12.0845 12.2053 11.8649 11.6752 11.4741 11.2844C11.4393 11.2496 11.4035 11.2162 11.3666 11.1842C11.6508 10.8565 11.8086 10.4362 11.8086 9.99965ZM12.5612 2.49211L12.5612 2.4921L12.5579 2.48646C12.2968 2.0399 11.9233 1.66949 11.4746 1.41208C11.0259 1.15467 10.5176 1.01923 10.0003 1.01923C9.48305 1.01923 8.97477 1.15467 8.52607 1.41208C8.07737 1.66949 7.70388 2.0399 7.44277 2.48646L7.44275 2.48645L7.43949 2.49211L1.41034 12.9626C1.1542 13.402 1.01923 13.9014 1.01923 14.41C1.01923 14.9187 1.15422 15.4182 1.4104 15.8575C1.66986 16.3073 2.04406 16.6801 2.49479 16.9379C2.94501 17.1954 3.45543 17.3289 3.97402 17.3248H16.0269C16.5453 17.3286 17.0555 17.1949 17.5054 16.9374C17.9557 16.6796 18.3295 16.3071 18.5888 15.8577C18.8451 15.4186 18.9804 14.9194 18.9808 14.4109C18.9811 13.9022 18.8464 13.4025 18.5905 12.9629C18.59 12.962 18.5894 12.9611 18.5889 12.9602L12.5612 2.49211Z"
      fill="#D95C4A"
      stroke="var(--bg-page-color)"
      stroke-width="1.96155"
    />
  </svg>
);

const User = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M16.6666 17.5V15.8333C16.6666 14.9493 16.3155 14.1014 15.6903 13.4763C15.0652 12.8512 14.2174 12.5 13.3333 12.5H6.66665C5.78259 12.5 4.93474 12.8512 4.30962 13.4763C3.6845 14.1014 3.33331 14.9493 3.33331 15.8333V17.5"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M10 9.16667C11.841 9.16667 13.3334 7.67428 13.3334 5.83333C13.3334 3.99238 11.841 2.5 10 2.5C8.15907 2.5 6.66669 3.99238 6.66669 5.83333C6.66669 7.67428 8.15907 9.16667 10 9.16667Z"
      stroke="var(--icon-color)"
      stroke-width="1.66667"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const Copy = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <g clip-path="url(#clip0_4358_31006)">
      <path
        d="M16.6667 7.5H9.16667C8.24619 7.5 7.5 8.24619 7.5 9.16667V16.6667C7.5 17.5871 8.24619 18.3333 9.16667 18.3333H16.6667C17.5871 18.3333 18.3333 17.5871 18.3333 16.6667V9.16667C18.3333 8.24619 17.5871 7.5 16.6667 7.5Z"
        stroke="var(--icon-color)"
        stroke-width="1"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M4.16669 12.4998H3.33335C2.89133 12.4998 2.4674 12.3242 2.15484 12.0117C1.84228 11.6991 1.66669 11.2752 1.66669 10.8332V3.33317C1.66669 2.89114 1.84228 2.46722 2.15484 2.15466C2.4674 1.8421 2.89133 1.6665 3.33335 1.6665H10.8334C11.2754 1.6665 11.6993 1.8421 12.0119 2.15466C12.3244 2.46722 12.5 2.89114 12.5 3.33317V4.1665"
        stroke="var(--icon-color)"
        stroke-width="1"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </g>
    <defs>
      <clipPath id="clip0_4358_31006">
        <rect width="20" height="20" fill="white" />
      </clipPath>
    </defs>
  </svg>
);

const Approval = ({ height, width, hideStroke }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 20 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="10"
      cy="10"
      r="9"
      fill="#3CB179"
      stroke="var(--bg-page-color)"
      stroke-width={hideStroke ? "0" : "2"}
    />
    <path
      d="M14 7L8.5 12.5L6 10"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const Reject = ({ height, width, hideStroke }) => (
  <svg
    width={width ?? 21}
    height={height ?? 20}
    viewBox="0 0 21 20"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle
      cx="10.5"
      cy="10"
      r="9"
      fill="#D95C4A"
      stroke="var(--bg-page-color)"
      stroke-width={hideStroke ? "0" : "2"}
    />
    <path
      d="M13.5 7L7.5 13"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M7.5 7L13.5 13"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const Warning = ({ height, width }) => (
  <svg
    width={width ?? 21}
    height={height ?? 20}
    viewBox="0 0 32 33"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M10.4801 3.16675H21.5201L29.3334 10.9801V22.0201L21.5201 29.8334H10.4801L2.66675 22.0201V10.9801L10.4801 3.16675Z"
      stroke="#B17108"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M16 11.1667V16.5001"
      stroke="#B17108"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M16 21.8333H16.0133"
      stroke="#B17108"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const ApprovedStatus = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 32 33"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="16.5" cy="16.5" r="16" fill="#3CB179" />
    <path
      d="M24.5 10.5L13.5 21.5L8.5 16.5"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const RejectedStatus = ({ height, width }) => (
  <svg
    width={width ?? 21}
    height={height ?? 20}
    viewBox="0 0 32 33"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="16" cy="16.5" r="16" fill="#D95C4A" />
    <path
      d="M22 10.5L10 22.5"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <path
      d="M10 10.5L22 22.5"
      stroke="white"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

const Check = ({ height, width }) => (
  <svg
    width={width ?? 20}
    height={height ?? 20}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M20 6L9 17L4 12"
      stroke="var(--icon-color)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

return {
  NearToken,
  WithdrawIcon,
  StakeIcon,
  UnstakeIcon,
  AccountLocker,
  Whitelist,
  VerifiedTick,
  NotVerfiedTick,
  User,
  Copy,
  Approval,
  Reject,
  Warning,
  ApprovedStatus,
  RejectedStatus,
  Check,
};
