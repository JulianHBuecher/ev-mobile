import I18n from 'i18n-js';
import { Icon, Spinner, View } from 'native-base';
import React from 'react';

import { SafeAreaView } from 'react-native';
import { TouchableOpacity } from 'react-native-gesture-handler';
import Orientation from 'react-native-orientation-locker';
import { scale } from 'react-native-size-matters';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import I18nManager from '../../I18n/I18nManager';
import computeFabStyles from '../../components/fab/FabComponentStyles';
import HeaderComponent from '../../components/header/HeaderComponent';
import ItemsList from '../../components/list/ItemsList';
import ReservationComponent from '../../components/reservation/ReservationComponent';
import SimpleSearchComponent from '../../components/search/simple/SimpleSearchComponent';
import SelectableList, { SelectableProps, SelectableState } from '../../screens/base-screen/SelectableList';
import { DataResult } from '../../types/DataResult';
import { PagingParams } from '../../types/QueryParams';
import Reservation from '../../types/Reservation';
import User from '../../types/User';
import Constants from '../../utils/Constants';
import Utils from '../../utils/Utils';
import ReservationsFilters, { ReservationsFiltersDef } from './ReservationsFilters';
import computeStyleSheet from './ReservationsStyles';

export interface Props extends SelectableProps<Reservation> {
  userIDs?: string[];
  sorting?: string;
}

interface State extends SelectableState<Reservation> {
  reservations?: Reservation[];
  loading?: boolean;
  refreshing?: boolean;
  skip?: number;
  limit?: number;
  isAdmin?: boolean;
  filters?: ReservationsFiltersDef;
  reservationsFromDate?: Date;
  reservationsToDate?: Date;
}

export default class Reservations extends SelectableList<Reservation> {
  public state: State;
  public props: Props;
  private searchText: string;

  public constructor(props: Props) {
    super(props);
    this.selectMultipleTitle = 'reservations.selectReservations';
    this.selectSingleTitle = 'reservations.selectReservation';
    this.singleItemTitle = I18n.t('reservations.title');
    this.multiItemsTitle = I18n.t('reservations.titles');
    this.state = {
      reservations: [],
      loading: true,
      refreshing: false,
      skip: 0,
      limit: Constants.PAGING_SIZE,
      count: 0,
      isAdmin: false,
      filters: null,
      reservationsFromDate: null,
      reservationsToDate: null,
      selectedItems: []
    };
  }

  public setState = (
    state: State | ((prevState: Readonly<State>, props: Readonly<Props>) => State | Pick<State, never>) | Pick<State, never>,
    callback?: () => void
  ) => {
    super.setState(state, callback);
  };

  public async componentDidMount(triggerRefresh: boolean = true): Promise<void> {
    await super.componentDidMount();
    // When filters are enabled, first refresh is triggered via onFiltersChanged
    if (!this.screenFilters) {
      await this.refresh(true);
    }
    this.handleNavigationParameters();
  }

  public componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>, snapshot?: any): void {
    const prevNavParams = JSON.stringify(prevProps.route?.params);
    const currentNavParams = JSON.stringify(this.props.route?.params);
    if (currentNavParams && currentNavParams !== prevNavParams) {
      this.handleNavigationParameters();
    }
  }

  public componentWillUnmount(): void {
    super.componentWillUnmount();
    Orientation.unlockAllOrientations();
  }

  public async componentDidFocus(): Promise<void> {
    super.componentDidFocus();
    Orientation.lockToPortrait();
    await this.refresh(Utils.getParamFromNavigation(this.props.route, 'refresh', false, true) as boolean);
  }

  public getReservations = async (searchText: string = '', paging: PagingParams, params?: {}): Promise<DataResult<Reservation>> => {
    try {
      const { sorting, isModal } = this.props;
      const { fromDateTime, toDateTime, expiryDateTime, users } = this.state.filters;
      const userID = isModal ? this.props.userIDs?.join('|') : users?.map((user: User) => user?.id).join('|');
      params = params ?? {
        Search: searchText,
        UserID: userID,
        StartDateTime: fromDateTime,
        EndDateTime: toDateTime,
        WithChargingStation: true,
        WithSiteArea: true,
        WithTag: true,
        WithUser: true,
        WithCar: true
      };
      const reservations = await this.centralServerProvider.getReservations(params, paging, [sorting ?? '-createdOn']);
      if (reservations?.count === -1) {
        const reservationsNbrRecordsOnly = await this.centralServerProvider.getReservations(params, Constants.ONLY_RECORD_COUNT);
        reservations.count = reservationsNbrRecordsOnly?.count;
      }
      return reservations;
    } catch (error) {
      // Other common Error
      await Utils.handleHttpUnexpectedError(
        this.centralServerProvider,
        error,
        'reservations.reservationsUnexpectedError',
        this.props.navigation,
        this.refresh.bind(this)
      );
    }
    return null;
  };

  public onBack() {
    // Force Back navigation
    this.props.navigation.goBack();
    return true;
  }

  public async refresh(showSpinner = false) {
    if (this.isMounted()) {
      const { skip, limit } = this.state;
      const newState = showSpinner ? (Utils.isEmptyArray(this.state.reservations) ? { loading: true } : { refreshing: true }) : this.state;
      this.setState(newState, async () => {
        // Refresh all
        const reservations = await this.getReservations(this.searchText, { skip: 0, limit: skip + limit });
        // Set Reservations
        this.setState({
          loading: false,
          refreshing: false,
          reservations: reservations ? reservations.result : [],
          count: reservations ? reservations.count : 0,
          isAdmin: this.securityProvider ? this.securityProvider.isAdmin() : false
        });
      });
    }
  }

  public manualRefresh = async () => {
    // Display Spinner
    this.setState({ refreshing: true });
    await this.refresh(true);
    // Hide Spinner
    this.setState({ refreshing: false });
  };

  public onEndScroll = async () => {
    const { count, skip, limit } = this.state;
    // Reached the end?
    if (skip + limit < count || count === -1) {
      // Then get next reservations
      const reservations = await this.getReservations(this.searchText, { skip: skip + Constants.PAGING_SIZE, limit });
      // Add reservations
      this.setState((prevState, props) => ({
        reservations: [...prevState.reservations, ...reservations.result],
        skip: prevState.skip + Constants.PAGING_SIZE,
        refreshing: false
      }));
    }
  };

  public search = async (searchText: string) => {
    this.searchText = searchText;
    await this.refresh(true);
  };

  public onFiltersChanged(newFilters: ReservationsFiltersDef) {
    this.setState({ filters: newFilters }, async () => this.refresh(true));
  }

  public render() {
    const style = computeStyleSheet();
    const { navigation, isModal } = this.props;
    const { loading, isAdmin, reservations, skip, count, limit, refreshing } = this.state;
    const fabStyles = computeFabStyles();
    return (
      <View style={style.container}>
        {!isModal && (
          <SafeAreaView style={fabStyles.fabContainer}>
            <TouchableOpacity onPress={() => navigation.navigate('AddReservation')} style={fabStyles.fab}>
              <Icon style={fabStyles.fabIcon} size={scale(18)} as={MaterialCommunityIcons} name={'plus'} />
            </TouchableOpacity>
          </SafeAreaView>
        )}
        <HeaderComponent
          ref={(headerComponent: HeaderComponent) => {
            this.setHeaderComponent(headerComponent);
          }}
          navigation={navigation}
          title={I18n.t('reservations.titles')}
          subTitle={count > 0 ? `(${I18nManager.formatNumber(count)})` : null}
          sideBar={this.canOpenDrawer}
          containerStyle={style.headerContainer}
        />
        {this.renderFilters()}
        {loading ? (
          <Spinner size={scale(30)} style={style.spinner} color="grey" />
        ) : (
          <View style={style.content}>
            <ItemsList<Reservation>
              data={reservations}
              ref={this.itemsListRef}
              skip={skip}
              count={count}
              onEndReached={this.onEndScroll}
              renderItem={(item: Reservation, selected: boolean) => (
                <ReservationComponent
                  navigation={navigation}
                  reservation={item}
                  containerStyle={[style.reservationComponentContainer]}
                  isAdmin={isAdmin}
                  isSiteAdmin={this.securityProvider?.isSiteAdmin(item.chargingStation.siteArea.siteID)}
                  isSmartChargingActive={this.securityProvider?.isComponentSmartCharging()}
                  isCarActive={this.securityProvider?.isComponentCarActive()}
                />
              )}
              manualRefresh={this.manualRefresh.bind(this)}
              refreshing={refreshing}
              emptyTitle={I18n.t('reservations.noReservations')}
              navigation={navigation}
              limit={limit}
            />
          </View>
        )}
      </View>
    );
  }

  protected onItemsSelected(selectedItems: T[]): void {
    this.setState({ selectedItems }, () => this.props.onItemsSelected?.(selectedItems));
  }

  private handleNavigationParameters(): void {
    const reservationID = Utils.getParamFromNavigation(this.props.route, 'ReservationID', null, true);
    if (reservationID) {
      this.props.navigation.navigate('ReservationDetailsTabs', {
        params: { reservationID },
        key: `${Utils.randomNumber()}`
      });
    }
  }

  private renderFilters() {
    const areModalFiltersActive = this.screenFilters?.areModalFiltersActive();
    const style = computeStyleSheet();
    const commonColors = Utils.getCurrentCommonColor();
    return (
      <View style={style.filtersContainer}>
        <ReservationsFilters
          reservationFromDate={this.state.reservationsFromDate}
          reservationToDate={this.state.reservationsToDate}
          onFilterChanged={(newFilters: ReservationsFiltersDef) => this.onFiltersChanged(newFilters)}
          ref={(reservationsFilters: ReservationsFilters) => this.setScreenFilters(reservationsFilters, false)}
        />
        <SimpleSearchComponent
          containerStyle={style.searchBarComponent}
          onChange={async (searchText: string) => this.search(searchText)}
          navigation={this.props.navigation}
        />
        {this.screenFilters?.canFilter() && (
          <TouchableOpacity onPress={() => this.screenFilters?.openModal()} style={style.filterButton}>
            <Icon
              color={commonColors.textColor}
              size={scale(25)}
              as={MaterialCommunityIcons}
              name={areModalFiltersActive ? 'filter' : 'filter-outline'}
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }
}
